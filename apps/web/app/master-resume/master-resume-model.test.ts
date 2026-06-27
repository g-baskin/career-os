import { describe, expect, it } from "vitest";
import { countReviewQueueByStatus, masterResumeResultFromEnvelope, normalizeMasterResume } from "./master-resume-model";

const masterResume = {
  id: "master-resume-1",
  userId: "demo-user",
  content: {
    rawText: "Skills: Splunk, Cribl, Terraform",
    source: "pasted_plain_text",
    importedAt: "2026-06-27T00:00:00.000Z",
    parseVersion: "master-resume-parser-v1",
    candidateFacts: [
      { factType: "tool", category: "splunk", label: "Splunk", value: "Splunk", sourceType: "resume_import", confidence: 0.95, verificationStatus: "needs_review", allowedInResume: false, requiresReview: true, evidence: "Skills: Splunk" }
    ],
    stats: { rawTextLength: 32, candidateFactCount: 1 }
  }
};

const profileFact = {
  id: "profile-fact-1",
  userId: "demo-user",
  factType: "tool",
  category: "splunk",
  label: "Splunk",
  value: "Splunk",
  sourceType: "resume_import",
  confidence: 0.95,
  verificationStatus: "needs_review",
  allowedInResume: false,
  allowedInCoverLetter: false,
  allowedInRecruiterMessage: false,
  requiresReview: true,
  isBlocked: false
};

describe("master resume model", () => {
  it("normalizes master resume content", () => {
    const normalized = normalizeMasterResume(masterResume);

    expect(normalized?.id).toBe("master-resume-1");
    expect(normalized?.candidateFacts[0]?.label).toBe("Splunk");
    expect(normalized?.stats.candidateFactCount).toBe(1);
  });

  it("reads command envelopes from import responses", () => {
    const parsed = masterResumeResultFromEnvelope({
      ok: true,
      data: {
        commandId: "command-1",
        status: "completed",
        result: {
          masterResume,
          candidateFacts: [profileFact],
          reviewQueue: [profileFact],
          skippedCandidates: [{ label: "CISSP", factType: "certification", reason: "blocked_claim" }],
          sourceSnapshotId: "snapshot-1"
        }
      }
    });

    expect(parsed.masterResume?.id).toBe("master-resume-1");
    expect(parsed.candidateFacts[0]?.verificationStatus).toBe("needs_review");
    expect(parsed.reviewQueue.length).toBe(1);
    expect(parsed.skippedCandidates[0]?.reason).toBe("blocked_claim");
    expect(parsed.sourceSnapshotId).toBe("snapshot-1");
  });

  it("counts review statuses", () => {
    const counts = countReviewQueueByStatus([
      profileFact,
      { ...profileFact, id: "profile-fact-2", label: "Cribl", verificationStatus: "verified", allowedInResume: true, requiresReview: false },
      { ...profileFact, id: "profile-fact-3", label: "CISSP", verificationStatus: "blocked", isBlocked: true, requiresReview: false }
    ]);

    expect(counts.needsReview).toBe(1);
    expect(counts.verified).toBe(1);
    expect(counts.blocked).toBe(1);
  });
});
