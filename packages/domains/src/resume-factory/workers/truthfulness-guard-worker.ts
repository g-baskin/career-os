import type { TechnicalResumeDraft } from "./technical-resume-worker";

type ResumeDraftLike = Pick<TechnicalResumeDraft, "sections" | "content"> | string;

export interface TruthfulnessGuardInput {
  draft: ResumeDraftLike;
  verifiedFacts: string[];
}

export interface TruthfulnessGuardResult {
  ok: boolean;
  blockedClaims: string[];
  groundedClaims: string[];
  warnings: string[];
}

function normalizeClaim(value: string) {
  return value
    .trim()
    .replace(/^[-*•]\s*/, "")
    .replace(/[.。]+$/, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function extractDraftClaims(draft: ResumeDraftLike) {
  if (typeof draft === "string") {
    return draft
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^[-*•]\s+/.test(line))
      .map((line) => line.replace(/^[-*•]\s+/, ""));
  }

  return draft.sections.flatMap((section) => section.bullets);
}

export function assessResumeTruthfulness(input: TruthfulnessGuardInput): TruthfulnessGuardResult {
  const factSet = new Set(input.verifiedFacts.map(normalizeClaim).filter(Boolean));
  const claims = extractDraftClaims(input.draft);
  const blockedClaims = claims.filter((claim) => !factSet.has(normalizeClaim(claim)));
  const groundedClaims = claims.filter((claim) => factSet.has(normalizeClaim(claim)));
  const warnings = [
    "This guard only accepts draft bullets that exactly match a supplied verified fact.",
    "Human review is required before using the draft externally."
  ];

  if (factSet.size === 0) {
    return {
      ok: false,
      blockedClaims: claims,
      groundedClaims: [],
      warnings: ["No verified facts were supplied; resume generation is blocked.", ...warnings]
    };
  }

  return {
    ok: blockedClaims.length === 0,
    blockedClaims,
    groundedClaims,
    warnings
  };
}

export class TruthfulnessGuardWorker {
  assess(input: TruthfulnessGuardInput) {
    return assessResumeTruthfulness(input);
  }
}
