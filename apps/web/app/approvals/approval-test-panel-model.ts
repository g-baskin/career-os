export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired" | "cancelled";
export type ApprovalReplayStatus = "not_started" | "in_progress" | "completed" | "failed";

export interface ApprovalView {
  id: string;
  userId?: string;
  commandId: string;
  commandType: string;
  permission: string;
  entityType?: string;
  entityId?: string;
  status: ApprovalStatus;
  riskLevel: string;
  reason: string;
  requestedAt: string;
  createdAt?: string;
  updatedAt?: string;
  decidedAt?: string | null;
  replayStatus: ApprovalReplayStatus;
  replayedCommandId?: string;
  replayAttemptCount: number;
  replayedAt?: string | null;
}

export interface ApprovalCounts {
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

export interface CommandSummary {
  ok: boolean;
  commandId?: string;
  status?: string;
  approvalRequestId?: string;
  errorCode?: string;
  errorMessage?: string;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function normalizeDateString(value: unknown) {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return new Date(0).toISOString();
}

function normalizeStatus(value: unknown): ApprovalStatus {
  if (value === "approved" || value === "rejected" || value === "expired" || value === "cancelled") return value;
  return "pending";
}

function normalizeReplayStatus(value: unknown): ApprovalReplayStatus {
  if (value === "in_progress" || value === "completed" || value === "failed") return value;
  return "not_started";
}

export function normalizeApproval(value: unknown): ApprovalView | undefined {
  if (!isRecord(value)) return undefined;
  const id = asString(value.id);
  const commandId = asString(value.commandId);
  const commandType = asString(value.commandType);
  const permission = asString(value.permission);
  if (!id || !commandId || !commandType || !permission) return undefined;

  return {
    id,
    userId: asOptionalString(value.userId),
    commandId,
    commandType,
    permission,
    entityType: asOptionalString(value.entityType),
    entityId: asOptionalString(value.entityId),
    status: normalizeStatus(value.status),
    riskLevel: asString(value.riskLevel, "medium"),
    reason: asString(value.reason, "Approval required"),
    requestedAt: normalizeDateString(value.requestedAt),
    createdAt: asOptionalString(value.createdAt),
    updatedAt: asOptionalString(value.updatedAt),
    decidedAt: typeof value.decidedAt === "string" ? value.decidedAt : null,
    replayStatus: normalizeReplayStatus(value.replayStatus),
    replayedCommandId: asOptionalString(value.replayedCommandId),
    replayAttemptCount: typeof value.replayAttemptCount === "number" ? value.replayAttemptCount : 0,
    replayedAt: typeof value.replayedAt === "string" ? value.replayedAt : null
  };
}

export function approvalsFromEnvelope(envelope: unknown): ApprovalView[] {
  if (!isRecord(envelope) || envelope.ok !== true || !isRecord(envelope.data) || !Array.isArray(envelope.data.approvals)) return [];
  return envelope.data.approvals.map(normalizeApproval).filter((approval): approval is ApprovalView => Boolean(approval));
}

export function countApprovals(approvals: ApprovalView[]): ApprovalCounts {
  return approvals.reduce<ApprovalCounts>(
    (counts, approval) => {
      if (approval.status === "pending") counts.pending += 1;
      if (approval.status === "approved") counts.approved += 1;
      if (approval.status === "rejected") counts.rejected += 1;
      if (approval.status === "cancelled") counts.cancelled += 1;
      return counts;
    },
    { pending: 0, approved: 0, rejected: 0, cancelled: 0 }
  );
}

export function commandSummaryFromEnvelope(envelope: unknown): CommandSummary | undefined {
  if (!isRecord(envelope)) return undefined;

  if (envelope.ok === true && isRecord(envelope.data)) {
    const command = isRecord(envelope.data.command) ? envelope.data.command : envelope.data;
    return {
      ok: true,
      commandId: asOptionalString(command.commandId),
      status: asOptionalString(command.status),
      approvalRequestId: asOptionalString(command.approvalRequestId)
    };
  }

  if (envelope.ok === false) {
    const command = isRecord(envelope.command) ? envelope.command : undefined;
    const error = isRecord(envelope.error) ? envelope.error : undefined;
    return {
      ok: false,
      commandId: asOptionalString(command?.id),
      status: asOptionalString(command?.status),
      approvalRequestId: asOptionalString(command?.approvalRequestId),
      errorCode: asOptionalString(error?.code),
      errorMessage: asOptionalString(error?.message)
    };
  }

  return undefined;
}
