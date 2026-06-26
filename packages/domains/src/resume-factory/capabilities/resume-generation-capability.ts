import type { CapabilityDefinition } from "@career-os/shared";

export interface ResumeGenerationCapability extends CapabilityDefinition {
  name: "ResumeGenerationCapability";
  requiresHumanReview: true;
  truthfulnessContract: "verified-facts-only";
}

export const resumeGenerationCapability: ResumeGenerationCapability = {
  name: "ResumeGenerationCapability",
  description: "Generates review-required resume drafts by restating user-supplied verified facts only.",
  workers: ["TechnicalResumeWorker", "TruthfulnessGuardWorker"],
  commands: ["resume.generate", "resume.generate_placeholder"],
  events: ["resume.generated", "resume.placeholder_created"],
  permissions: ["generate_resume"],
  requiresHumanReview: true,
  truthfulnessContract: "verified-facts-only"
};
