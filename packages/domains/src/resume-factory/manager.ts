import type { EventStore } from "@career-os/events";
import type { SnapshotStore } from "@career-os/snapshots";
import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";
import type { StateStore } from "@career-os/state";
import { resumeGenerationCapability } from "./capabilities";
import { buildTechnicalResumeDraft, normalizeVerifiedFacts, type TechnicalResumeDraft } from "./workers/technical-resume-worker";
import { assessResumeTruthfulness, type TruthfulnessGuardResult } from "./workers/truthfulness-guard-worker";

export const RESUME_GENERATE_COMMAND = "resume.generate";
export const RESUME_GENERATE_PLACEHOLDER_COMMAND = "resume.generate_placeholder";
export const RESUME_GENERATED_EVENT = "resume.generated";
export const RESUME_PLACEHOLDER_CREATED_EVENT = "resume.placeholder_created";
export const RESUME_CURRENT_DRAFT_PROJECTION = "resume.current_draft";
export const RESUME_SOURCE_INPUT_SNAPSHOT = "resume.source_input";

export const definition: DomainDefinition = {
  name: "Resume Factory Domain",
  slug: "resume-factory",
  manager: "Resume Factory Manager",
  capabilities: ["ResumeGenerationCapability"],
  workers: ["TechnicalResumeWorker", "TruthfulnessGuardWorker"],
  tools: ["TruthfulnessGuardTool"],
  commands: [RESUME_GENERATE_COMMAND, RESUME_GENERATE_PLACEHOLDER_COMMAND],
  events: [RESUME_GENERATED_EVENT, RESUME_PLACEHOLDER_CREATED_EVENT],
  permissions: ["generate_resume"],
  dependencies: ["application-packet", "event-store", "state-store", "snapshot-store"],
  status: "implemented",
  version: "1.0.0"
};

export interface ResumeGenerationRequest {
  jobId: string;
  companyId: string;
  applicationPacketId: string;
  resumeVersionId?: string;
  verifiedFacts: string[];
  targetRole?: string;
  companyName?: string;
  jobDescription?: string;
  targetKeywords?: string[];
}

export interface ResumeGenerationResult {
  draft: TechnicalResumeDraft;
  guard: TruthfulnessGuardResult;
  reviewRequired: true;
  sourceSnapshotId: string;
  warnings: string[];
}

export interface ResumeGenerationPlaceholder extends ResumeGenerationRequest {
  eventType: typeof RESUME_PLACEHOLDER_CREATED_EVENT;
  content: string;
  warnings: string[];
}

type ResumeGenerationPayload = Partial<ResumeGenerationRequest> & Record<string, unknown>;

type ResumeFactoryContext = DomainExecutionContext & {
  eventStore: EventStore;
  stateStore: StateStore;
  snapshotStore: SnapshotStore;
};

function isResumeGenerationPayload(payload: unknown): payload is ResumeGenerationPayload {
  return typeof payload === "object" && payload !== null;
}

function stringFrom(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalStringFrom(value: unknown) {
  const text = stringFrom(value);
  return text.length > 0 ? text : undefined;
}

function stringArrayFrom(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
}

function validationError(command: CareerCommand, code: string, message: string): CommandResult {
  return { ok: false, status: "rejected", commandId: command.id, error: { code, message } };
}

function buildRequest(command: CareerCommand): ResumeGenerationRequest | CommandResult {
  if (!isResumeGenerationPayload(command.payload)) {
    return validationError(command, "RESUME_PAYLOAD_REQUIRED", "Resume generation requires an object payload.");
  }

  const payload = command.payload;
  const request: ResumeGenerationRequest = {
    jobId: stringFrom(payload.jobId ?? command.entityId),
    companyId: stringFrom(payload.companyId),
    applicationPacketId: stringFrom(payload.applicationPacketId ?? command.entityId),
    resumeVersionId: optionalStringFrom(payload.resumeVersionId),
    verifiedFacts: normalizeVerifiedFacts(stringArrayFrom(payload.verifiedFacts)),
    targetRole: optionalStringFrom(payload.targetRole ?? payload.jobTitle),
    companyName: optionalStringFrom(payload.companyName),
    jobDescription: optionalStringFrom(payload.jobDescription),
    targetKeywords: stringArrayFrom(payload.targetKeywords)
  };

  if (!request.jobId) return validationError(command, "JOB_ID_REQUIRED", "jobId is required for resume generation.");
  if (!request.companyId) return validationError(command, "COMPANY_ID_REQUIRED", "companyId is required for resume generation.");
  if (!request.applicationPacketId) return validationError(command, "APPLICATION_PACKET_ID_REQUIRED", "applicationPacketId is required for resume generation.");
  if (request.verifiedFacts.length === 0) return validationError(command, "VERIFIED_FACTS_REQUIRED", "At least one verified fact is required; Resume Factory will not invent content.");

  return request;
}

function isCommandResult(value: ResumeGenerationRequest | CommandResult): value is CommandResult {
  return "ok" in value && "status" in value && "commandId" in value;
}

export class ResumeFactoryManager implements DomainManagerContract {
  readonly definition = definition;
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [resumeGenerationCapability];

  canHandle(command: CareerCommand) {
    return command.type === RESUME_GENERATE_COMMAND || command.type === RESUME_GENERATE_PLACEHOLDER_COMMAND;
  }

  createPlaceholder(request: ResumeGenerationRequest): ResumeGenerationPlaceholder {
    return {
      ...request,
      eventType: RESUME_PLACEHOLDER_CREATED_EVENT,
      content: "Resume placeholder only. AI generation/export is gated behind truthfulness checks and human approval.",
      warnings: ["Do not invent certifications, companies, dates, clearance, tools, or experience."]
    };
  }

  async handle(command: CareerCommand, context: DomainExecutionContext): Promise<CommandResult<ResumeGenerationResult>> {
    const requestOrError = buildRequest(command);
    if (isCommandResult(requestOrError)) return requestOrError as CommandResult<ResumeGenerationResult>;

    const request = requestOrError;
    const executionContext = context as ResumeFactoryContext;
    const draft = buildTechnicalResumeDraft(request);
    const guard = assessResumeTruthfulness({ draft, verifiedFacts: request.verifiedFacts });

    if (!guard.ok) {
      return {
        ok: false,
        status: "rejected",
        commandId: command.id,
        error: {
          code: "UNSUPPORTED_RESUME_CLAIMS_BLOCKED",
          message: "Resume draft contains claims not grounded in verifiedFacts.",
          details: { blockedClaims: guard.blockedClaims }
        }
      };
    }

    const sourceSnapshot = await executionContext.snapshotStore.captureSnapshot({
      userId: command.userId,
      entityType: "application_packet",
      entityId: request.applicationPacketId,
      snapshotType: RESUME_SOURCE_INPUT_SNAPSHOT,
      source: RESUME_SOURCE_INPUT_SNAPSHOT,
      data: {
        commandId: command.id,
        request,
        capturedFor: draft.id
      }
    });

    const generatedEvent = await executionContext.eventStore.append({
      eventType: RESUME_GENERATED_EVENT,
      entityType: "resume",
      entityId: draft.id,
      domain: definition.slug,
      manager: definition.manager,
      capability: "ResumeGenerationCapability",
      worker: "TechnicalResumeWorker",
      userId: command.userId,
      payload: {
        commandId: command.id,
        applicationPacketId: request.applicationPacketId,
        jobId: request.jobId,
        companyId: request.companyId,
        draft,
        guard,
        reviewRequired: true,
        warnings: [...draft.warnings, ...guard.warnings]
      },
      evidence: {
        verifiedFacts: request.verifiedFacts,
        sourceSnapshotId: sourceSnapshot.id,
        truthfulnessContract: "verified-facts-only"
      },
      confidence: 1
    });

    if (command.type === RESUME_GENERATE_PLACEHOLDER_COMMAND) {
      await executionContext.eventStore.append({
        eventType: RESUME_PLACEHOLDER_CREATED_EVENT,
        entityType: "resume",
        entityId: draft.id,
        domain: definition.slug,
        manager: definition.manager,
        capability: "ResumeGenerationCapability",
        worker: "TechnicalResumeWorker",
        userId: command.userId,
        payload: {
          commandId: command.id,
          draftId: draft.id,
          legacyAliasFor: RESUME_GENERATED_EVENT
        },
        evidence: { generatedEventId: generatedEvent.id },
        confidence: 1
      });
    }

    await executionContext.stateStore.upsertProjection({
      userId: command.userId,
      projectionType: RESUME_CURRENT_DRAFT_PROJECTION,
      entityType: "application_packet",
      entityId: request.applicationPacketId,
      sourceEventId: generatedEvent.id,
      data: {
        draft,
        guard,
        reviewRequired: true,
        sourceSnapshotId: sourceSnapshot.id,
        sourceEventId: generatedEvent.id,
        updatedByCommandId: command.id
      },
      updatedAt: new Date()
    });

    const emittedEvents = command.type === RESUME_GENERATE_PLACEHOLDER_COMMAND ? [RESUME_GENERATED_EVENT, RESUME_PLACEHOLDER_CREATED_EVENT] : [RESUME_GENERATED_EVENT];

    return {
      ok: true,
      status: "completed",
      commandId: command.id,
      data: {
        draft,
        guard,
        reviewRequired: true,
        sourceSnapshotId: sourceSnapshot.id,
        warnings: [...draft.warnings, ...guard.warnings]
      },
      emittedEvents,
      updatedProjections: [RESUME_CURRENT_DRAFT_PROJECTION]
    };
  }
}
