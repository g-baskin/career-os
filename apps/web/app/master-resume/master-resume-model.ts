import { normalizeProfileFact, type ProfileFactView } from "../profile-facts/profile-facts-model";

export const MASTER_RESUME_DEMO_USER_ID = "demo-user";
export const SAMPLE_MASTER_RESUME_TEXT = `Splunk / Cribl Platform Engineer

Skills: Splunk, Splunk Enterprise, Cribl, Cribl Stream, SIEM, log onboarding, Linux, Terraform, AWS, Azure, GCP, observability, DevOps.
Experience: Built security data pipelines, supported platform engineering teams, and managed props/transforms for GDI workflows.
Certifications: Splunk Architect, Cribl Admin. CISSP and Security+ are not claimed.
Clearance: No active clearance.`;

export interface ParsedCandidateFactView {
  factType: string;
  category?: string;
  label: string;
  value?: string;
  description?: string;
  sourceType: string;
  confidence: number;
  verificationStatus: string;
  allowedInResume: boolean;
  requiresReview: boolean;
  evidence?: string;
}

export interface MasterResumeView {
  id: string;
  userId: string;
  rawText: string;
  source: string;
  importedAt: string;
  parseVersion: string;
  candidateFacts: ParsedCandidateFactView[];
  stats: {
    rawTextLength: number;
    candidateFactCount: number;
  };
}

export interface MasterResumeResultView {
  commandId?: string;
  commandStatus?: string;
  masterResume?: MasterResumeView;
  candidateFacts: ProfileFactView[];
  reviewQueue: ProfileFactView[];
  skippedCandidates: Array<{ label: string; factType: string; reason: string }>;
  sourceSnapshotId?: string;
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

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeCandidateFact(value: unknown): ParsedCandidateFactView | undefined {
  if (!isRecord(value)) return undefined;
  const factType = asString(value.factType);
  const label = asString(value.label);
  if (!factType || !label) return undefined;
  return {
    factType,
    category: asString(value.category) || undefined,
    label,
    value: asString(value.value) || undefined,
    description: asString(value.description) || undefined,
    sourceType: asString(value.sourceType, "resume_import"),
    confidence: asNumber(value.confidence, 0),
    verificationStatus: asString(value.verificationStatus, "needs_review"),
    allowedInResume: asBoolean(value.allowedInResume),
    requiresReview: asBoolean(value.requiresReview, true),
    evidence: asString(value.evidence) || undefined
  };
}

export function normalizeMasterResume(value: unknown): MasterResumeView | undefined {
  if (!isRecord(value) || !isRecord(value.content)) return undefined;
  const id = asString(value.id);
  const userId = asString(value.userId);
  if (!id || !userId) return undefined;
  const content = value.content;
  const stats = isRecord(content.stats) ? content.stats : {};
  return {
    id,
    userId,
    rawText: asString(content.rawText),
    source: asString(content.source, "unknown"),
    importedAt: asString(content.importedAt),
    parseVersion: asString(content.parseVersion, "unknown"),
    candidateFacts: Array.isArray(content.candidateFacts) ? content.candidateFacts.map(normalizeCandidateFact).filter((fact): fact is ParsedCandidateFactView => Boolean(fact)) : [],
    stats: {
      rawTextLength: asNumber(stats.rawTextLength),
      candidateFactCount: asNumber(stats.candidateFactCount)
    }
  };
}

function normalizeSkippedCandidate(value: unknown) {
  if (!isRecord(value)) return undefined;
  const label = asString(value.label);
  const factType = asString(value.factType);
  const reason = asString(value.reason);
  if (!label || !factType || !reason) return undefined;
  return { label, factType, reason };
}

export function masterResumeResultFromEnvelope(envelope: unknown): MasterResumeResultView {
  if (!isRecord(envelope)) return { candidateFacts: [], reviewQueue: [], skippedCandidates: [], errorCode: "INVALID_RESPONSE", errorMessage: "Master Resume API returned an unexpected response." };

  if (envelope.ok === false) {
    const error = isRecord(envelope.error) ? envelope.error : undefined;
    const command = isRecord(envelope.command) ? envelope.command : undefined;
    return {
      commandId: asString(command?.id) || undefined,
      commandStatus: asString(command?.status) || undefined,
      candidateFacts: [],
      reviewQueue: [],
      skippedCandidates: [],
      errorCode: asString(error?.code, "REQUEST_FAILED"),
      errorMessage: asString(error?.message, "Master Resume request failed.")
    };
  }

  if (envelope.ok === true && isRecord(envelope.data)) {
    const result = isRecord(envelope.data.result) ? envelope.data.result : envelope.data;
    return {
      commandId: asString(envelope.data.commandId) || undefined,
      commandStatus: asString(envelope.data.status) || undefined,
      masterResume: normalizeMasterResume(result.masterResume),
      candidateFacts: Array.isArray(result.candidateFacts) ? result.candidateFacts.map(normalizeProfileFact).filter((fact): fact is ProfileFactView => Boolean(fact)) : [],
      reviewQueue: Array.isArray(result.reviewQueue) ? result.reviewQueue.map(normalizeProfileFact).filter((fact): fact is ProfileFactView => Boolean(fact)) : [],
      skippedCandidates: Array.isArray(result.skippedCandidates) ? result.skippedCandidates.map(normalizeSkippedCandidate).filter((item): item is { label: string; factType: string; reason: string } => Boolean(item)) : [],
      sourceSnapshotId: asString(result.sourceSnapshotId) || undefined
    };
  }

  return { candidateFacts: [], reviewQueue: [], skippedCandidates: [], errorCode: "INVALID_RESPONSE", errorMessage: "Master Resume API returned an unexpected response." };
}

export function countReviewQueueByStatus(facts: ProfileFactView[]) {
  return facts.reduce(
    (summary, fact) => {
      if (fact.verificationStatus === "needs_review" || fact.requiresReview) summary.needsReview += 1;
      if (fact.verificationStatus === "verified") summary.verified += 1;
      if (fact.isBlocked || fact.verificationStatus === "blocked") summary.blocked += 1;
      return summary;
    },
    { needsReview: 0, verified: 0, blocked: 0 }
  );
}
