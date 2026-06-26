import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prisma as defaultPrisma } from "@career-os/db";
import { eventStore, prismaEventStore, type CareerEventInput, type EventStore } from "@career-os/events";
import type { ApprovalReplayStatus, ApprovalRequestInput, ApprovalRequestRecord, ApprovalStatus, CareerCommand, CommandResult, PermissionDecision, RiskLevel } from "@career-os/shared";

export interface ApprovalDecisionInput {
  decidedBy?: string;
  decisionPayload?: unknown;
  reason?: string;
}

export interface ApprovalRequestService {
  createForCommand(command: CareerCommand, decision: PermissionDecision): Promise<ApprovalRequestRecord> | ApprovalRequestRecord;
  list(): Promise<ApprovalRequestRecord[]> | ApprovalRequestRecord[];
  getById(id: string): Promise<ApprovalRequestRecord | undefined> | ApprovalRequestRecord | undefined;
  approve(id: string, input?: ApprovalDecisionInput): Promise<ApprovalRequestRecord | undefined> | ApprovalRequestRecord | undefined;
  reject(id: string, input?: ApprovalDecisionInput): Promise<ApprovalRequestRecord | undefined> | ApprovalRequestRecord | undefined;
  cancel(id: string, input?: ApprovalDecisionInput): Promise<ApprovalRequestRecord | undefined> | ApprovalRequestRecord | undefined;
  expire(id: string, input?: ApprovalDecisionInput): Promise<ApprovalRequestRecord | undefined> | ApprovalRequestRecord | undefined;
  startReplay(id: string, replayCommandId: string): Promise<ApprovalRequestRecord | undefined> | ApprovalRequestRecord | undefined;
  completeReplay(id: string, result: CommandResult): Promise<ApprovalRequestRecord | undefined> | ApprovalRequestRecord | undefined;
  failReplay(id: string, error: unknown): Promise<ApprovalRequestRecord | undefined> | ApprovalRequestRecord | undefined;
}

type PrismaLike = {
  approvalRequest: {
    create(args: unknown): Promise<unknown>;
    findFirst(args: unknown): Promise<unknown>;
    findUnique(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<unknown[]>;
    update(args: unknown): Promise<unknown>;
  };
};

function createApprovalId() {
  return `approval_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function fallbackUserId(userId?: string) {
  return userId ?? "local-user";
}

function normalizeApproval(input: ApprovalRequestInput, id = input.id ?? createApprovalId()): ApprovalRequestRecord {
  const now = new Date();
  return {
    ...input,
    id,
    userId: fallbackUserId(input.userId),
    status: input.status ?? "pending",
    requestedAt: input.requestedAt ?? now,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    replayStatus: input.replayStatus ?? "not_started",
    replayAttemptCount: input.replayAttemptCount ?? 0
  };
}

function toApprovalRecord(row: unknown): ApprovalRequestRecord | undefined {
  if (!row || typeof row !== "object") return undefined;
  const record = row as ApprovalRequestRecord;
  return {
    ...record,
    status: (record.status ?? "pending") as ApprovalStatus,
    riskLevel: (record.riskLevel ?? "medium") as RiskLevel,
    userId: fallbackUserId(record.userId),
    requestedAt: new Date(record.requestedAt ?? record.createdAt),
    createdAt: new Date(record.createdAt),
    updatedAt: new Date(record.updatedAt ?? record.createdAt),
    decidedAt: record.decidedAt ? new Date(record.decidedAt) : undefined,
    expiresAt: record.expiresAt ? new Date(record.expiresAt) : undefined,
    replayedAt: record.replayedAt ? new Date(record.replayedAt) : undefined,
    replayStatus: (record.replayStatus ?? "not_started") as ApprovalReplayStatus,
    replayAttemptCount: record.replayAttemptCount ?? 0
  };
}

function toApprovalRecords(rows: unknown[]) {
  return rows.map(toApprovalRecord).filter((row): row is ApprovalRequestRecord => Boolean(row));
}

function approvalEvent(record: ApprovalRequestRecord, eventType: string): CareerEventInput {
  return {
    eventType,
    entityType: eventType.startsWith("command.") ? "command" : record.entityType ?? "approval_request",
    entityId: eventType.startsWith("command.") ? record.commandId : record.entityId ?? record.id,
    domain: "orchestration",
    manager: "ApprovalRequestService",
    capability: "HumanApprovalGateCapability",
    worker: "ApprovalRequestWorker",
    userId: record.userId,
    payload: {
      approvalRequestId: record.id,
      commandId: record.commandId,
      commandType: record.commandType,
      permission: record.permission,
      entityType: record.entityType,
      entityId: record.entityId,
      riskLevel: record.riskLevel,
      reason: record.reason,
      userId: record.userId,
      replayStatus: record.replayStatus,
      replayedCommandId: record.replayedCommandId,
      replayAttemptCount: record.replayAttemptCount,
      replayedAt: record.replayedAt
    },
    confidence: 1
  };
}

function replayErrorPayload(error: unknown) {
  if (error && typeof error === "object") return error;
  return { message: error instanceof Error ? error.message : String(error) };
}

export class InMemoryApprovalRequestService implements ApprovalRequestService {
  private requests = new Map<string, ApprovalRequestRecord>();

  constructor(private readonly eventStore?: EventStore) {}

  createForCommand(command: CareerCommand, decision: PermissionDecision) {
    const existing = [...this.requests.values()].find((request) => request.commandId === command.id && request.status === "pending");
    if (existing) return existing;

    const request = normalizeApproval({
      userId: command.userId,
      commandId: command.id,
      commandType: command.type,
      permission: decision.permission,
      entityType: command.entityType,
      entityId: command.entityId,
      riskLevel: decision.riskLevel,
      reason: decision.reason,
      requestPayload: command.payload,
      requestedBy: command.requestedBy
    });
    this.requests.set(request.id, request);
    this.eventStore?.append(approvalEvent(request, "approval.requested"));
    return request;
  }

  list() {
    return [...this.requests.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getById(id: string) {
    return this.requests.get(id);
  }

  approve(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "approved", input, "approval.approved");
  }

  reject(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "rejected", input, "approval.rejected");
  }

  cancel(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "cancelled", input, "approval.cancelled");
  }

  expire(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "expired", input, "approval.expired");
  }

  startReplay(id: string, replayCommandId: string) {
    const existing = this.requests.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, replayStatus: "in_progress" as const, replayedCommandId: replayCommandId, replayAttemptCount: (existing.replayAttemptCount ?? 0) + 1, updatedAt: new Date() };
    this.requests.set(id, updated);
    this.eventStore?.append(approvalEvent(updated, "approval.replay_started"));
    return updated;
  }

  completeReplay(id: string, result: CommandResult) {
    const existing = this.requests.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, replayStatus: "completed" as const, replayResult: result, replayError: undefined, replayedAt: new Date(), updatedAt: new Date() };
    this.requests.set(id, updated);
    this.eventStore?.append(approvalEvent(updated, "approval.replay_completed"));
    return updated;
  }

  failReplay(id: string, error: unknown) {
    const existing = this.requests.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, replayStatus: "failed" as const, replayError: replayErrorPayload(error), updatedAt: new Date() };
    this.requests.set(id, updated);
    this.eventStore?.append(approvalEvent(updated, "approval.replay_failed"));
    return updated;
  }

  private decide(id: string, status: ApprovalStatus, input: ApprovalDecisionInput, eventType: string) {
    const existing = this.requests.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, status, decisionPayload: input.decisionPayload ?? { decidedBy: input.decidedBy, reason: input.reason }, decidedAt: new Date(), updatedAt: new Date() };
    this.requests.set(id, updated);
    this.eventStore?.append(approvalEvent(updated, eventType));
    if (status === "approved") this.eventStore?.append(approvalEvent(updated, "command.approval_granted"));
    if (status === "rejected") this.eventStore?.append(approvalEvent(updated, "command.approval_denied"));
    return updated;
  }
}

export class FileApprovalRequestService implements ApprovalRequestService {
  constructor(private readonly filePath = join(tmpdir(), "career-os-approval-requests.json"), private readonly eventStore?: EventStore) {}

  createForCommand(command: CareerCommand, decision: PermissionDecision) {
    const requests = this.readRequests();
    const existing = requests.find((request) => request.commandId === command.id && request.status === "pending");
    if (existing) return existing;

    const request = normalizeApproval({
      userId: command.userId,
      commandId: command.id,
      commandType: command.type,
      permission: decision.permission,
      entityType: command.entityType,
      entityId: command.entityId,
      riskLevel: decision.riskLevel,
      reason: decision.reason,
      requestPayload: command.payload,
      requestedBy: command.requestedBy
    });
    this.writeRequests([request, ...requests]);
    this.eventStore?.append(approvalEvent(request, "approval.requested"));
    return request;
  }

  list() {
    return this.readRequests().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getById(id: string) {
    return this.readRequests().find((request) => request.id === id);
  }

  approve(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "approved", input, "approval.approved");
  }

  reject(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "rejected", input, "approval.rejected");
  }

  cancel(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "cancelled", input, "approval.cancelled");
  }

  expire(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "expired", input, "approval.expired");
  }

  startReplay(id: string, replayCommandId: string) {
    return this.updateReplay(id, (existing) => ({ ...existing, replayStatus: "in_progress", replayedCommandId: replayCommandId, replayAttemptCount: (existing.replayAttemptCount ?? 0) + 1, updatedAt: new Date() }), "approval.replay_started");
  }

  completeReplay(id: string, result: CommandResult) {
    return this.updateReplay(id, (existing) => ({ ...existing, replayStatus: "completed", replayResult: result, replayError: undefined, replayedAt: new Date(), updatedAt: new Date() }), "approval.replay_completed");
  }

  failReplay(id: string, error: unknown) {
    return this.updateReplay(id, (existing) => ({ ...existing, replayStatus: "failed", replayError: replayErrorPayload(error), updatedAt: new Date() }), "approval.replay_failed");
  }

  clear() {
    this.writeRequests([]);
  }

  private updateReplay(id: string, updater: (existing: ApprovalRequestRecord) => ApprovalRequestRecord, eventType: string) {
    const requests = this.readRequests();
    const existing = requests.find((request) => request.id === id);
    if (!existing) return undefined;
    const updated = updater(existing);
    this.writeRequests(requests.map((request) => (request.id === id ? updated : request)));
    this.eventStore?.append(approvalEvent(updated, eventType));
    return updated;
  }

  private decide(id: string, status: ApprovalStatus, input: ApprovalDecisionInput, eventType: string) {
    const requests = this.readRequests();
    const existing = requests.find((request) => request.id === id);
    if (!existing) return undefined;
    const updated = { ...existing, status, decisionPayload: input.decisionPayload ?? { decidedBy: input.decidedBy, reason: input.reason }, decidedAt: new Date(), updatedAt: new Date() };
    this.writeRequests(requests.map((request) => (request.id === id ? updated : request)));
    this.eventStore?.append(approvalEvent(updated, eventType));
    if (status === "approved") this.eventStore?.append(approvalEvent(updated, "command.approval_granted"));
    if (status === "rejected") this.eventStore?.append(approvalEvent(updated, "command.approval_denied"));
    return updated;
  }

  private readRequests() {
    if (!existsSync(this.filePath)) return [];
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, "utf8")) as unknown;
      if (!Array.isArray(parsed)) return [];
      return toApprovalRecords(parsed);
    } catch {
      return [];
    }
  }

  private writeRequests(requests: ApprovalRequestRecord[]) {
    writeFileSync(this.filePath, JSON.stringify(requests, null, 2));
  }
}

export class PrismaApprovalRequestService implements ApprovalRequestService {
  constructor(private readonly eventStore?: EventStore, private readonly client: PrismaLike = defaultPrisma as unknown as PrismaLike) {}

  async createForCommand(command: CareerCommand, decision: PermissionDecision) {
    const existing = toApprovalRecord(
      await this.client.approvalRequest.findFirst({ where: { commandId: command.id, status: "pending" } })
    );
    if (existing) return existing;

    const normalized = normalizeApproval({
      userId: command.userId,
      commandId: command.id,
      commandType: command.type,
      permission: decision.permission,
      entityType: command.entityType,
      entityId: command.entityId,
      riskLevel: decision.riskLevel,
      reason: decision.reason,
      requestPayload: command.payload,
      requestedBy: command.requestedBy
    });
    const row = await this.client.approvalRequest.create({ data: normalized });
    const record = toApprovalRecord(row);
    if (!record) throw new Error("Failed to create approval request");
    await this.eventStore?.append(approvalEvent(record, "approval.requested"));
    return record;
  }

  async list() {
    return toApprovalRecords(await this.client.approvalRequest.findMany({ orderBy: { createdAt: "desc" } }));
  }

  async getById(id: string) {
    return toApprovalRecord(await this.client.approvalRequest.findUnique({ where: { id } }));
  }

  approve(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "approved", input, "approval.approved");
  }

  reject(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "rejected", input, "approval.rejected");
  }

  cancel(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "cancelled", input, "approval.cancelled");
  }

  expire(id: string, input: ApprovalDecisionInput = {}) {
    return this.decide(id, "expired", input, "approval.expired");
  }

  startReplay(id: string, replayCommandId: string) {
    return this.updateReplay(
      id,
      {
        replayStatus: "in_progress",
        replayedCommandId: replayCommandId,
        replayAttemptCount: { increment: 1 },
        updatedAt: new Date()
      },
      "approval.replay_started"
    );
  }

  completeReplay(id: string, result: CommandResult) {
    return this.updateReplay(
      id,
      {
        replayStatus: "completed",
        replayResult: result,
        replayError: undefined,
        replayedAt: new Date(),
        updatedAt: new Date()
      },
      "approval.replay_completed"
    );
  }

  failReplay(id: string, error: unknown) {
    return this.updateReplay(
      id,
      {
        replayStatus: "failed",
        replayError: replayErrorPayload(error),
        updatedAt: new Date()
      },
      "approval.replay_failed"
    );
  }

  private async updateReplay(id: string, data: Record<string, unknown>, eventType: string) {
    try {
      const row = await this.client.approvalRequest.update({ where: { id }, data });
      const record = toApprovalRecord(row);
      if (!record) return undefined;
      await this.eventStore?.append(approvalEvent(record, eventType));
      return record;
    } catch {
      return undefined;
    }
  }

  private async decide(id: string, status: ApprovalStatus, input: ApprovalDecisionInput, eventType: string) {
    try {
      const row = await this.client.approvalRequest.update({
        where: { id },
        data: {
          status,
          decisionPayload: input.decisionPayload ?? { decidedBy: input.decidedBy, reason: input.reason },
          decidedAt: new Date(),
          updatedAt: new Date()
        }
      });
      const record = toApprovalRecord(row);
      if (!record) return undefined;
      await this.eventStore?.append(approvalEvent(record, eventType));
      if (status === "approved") await this.eventStore?.append(approvalEvent(record, "command.approval_granted"));
      if (status === "rejected") await this.eventStore?.append(approvalEvent(record, "command.approval_denied"));
      return record;
    } catch {
      return undefined;
    }
  }
}

export const approvalRequestService = new InMemoryApprovalRequestService();
export const localApprovalRequestService = new FileApprovalRequestService(undefined, eventStore);
export const prismaApprovalRequestService = new PrismaApprovalRequestService(prismaEventStore);
