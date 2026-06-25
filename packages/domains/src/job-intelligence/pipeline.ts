import { eventStore } from "@career-os/events";
import { stateStore } from "@career-os/state";
import type { JobSegment, NormalizedJob } from "@career-os/shared";
import { classifyRemote, normalizeJob, scoreFit, segmentClearance, segmentJob } from "./index";

export interface JobPipelineInput extends Partial<NormalizedJob> { id?: string; companyId?: string; certifications?: string[]; requiredFields?: string[]; hasEasyApply?: boolean; recruiterEmail?: string; }
export interface JobPipelineResult { jobId: string; normalizedJob: NormalizedJob; remoteClassification: ReturnType<typeof classifyRemote>; clearanceSegment: JobSegment | null; certificationClassification: { required: string[]; preferred: string[]; blocked: string[] }; fitScore: number; applicationDifficultyScore: number; dashboardSegment: JobSegment; eventsEmitted: string[]; }

const blockedCertifications = ["cissp", "security+"];
export function classifyCertifications(job: NormalizedJob, explicit: string[] = []) {
  const text = `${job.title} ${job.description ?? ""}`.toLowerCase();
  const found = [...explicit, ...blockedCertifications.filter((cert) => text.includes(cert))];
  return { required: found, preferred: [], blocked: found.filter((cert) => blockedCertifications.includes(cert.toLowerCase())) };
}
export function scoreApplicationDifficulty(input: JobPipelineInput): number {
  const fields = input.requiredFields?.length ?? 0;
  const easyApplyAdjustment = input.hasEasyApply ? -20 : 0;
  return Math.max(0, Math.min(100, 25 + fields * 5 + easyApplyAdjustment));
}
export async function runJobPipeline(input: JobPipelineInput): Promise<JobPipelineResult> {
  const jobId = input.id ?? `job_${Date.now()}`;
  const eventsEmitted: string[] = [];
  try {
    const normalizedJob = normalizeJob(input as Partial<NormalizedJob> & Record<string, unknown>);
    const remoteClassification = classifyRemote(normalizedJob);
    const clearanceSegment = segmentClearance(normalizedJob);
    const certificationClassification = classifyCertifications(normalizedJob, input.certifications);
    const fitScore = scoreFit(normalizedJob);
    const applicationDifficultyScore = scoreApplicationDifficulty(input);
    const dashboardSegment = certificationClassification.blocked.length > 0 ? "Low Fit" : segmentJob(normalizedJob);
    for (const eventType of ["job.normalized", "job.remote_classified", "job.clearance_segmented", "job.certification_classified", "job.scored", "job.application_difficulty_scored", "job.pipeline_completed"]) {
      eventStore.append({ eventType, entityType: "job", entityId: jobId, domain: "job-intelligence", manager: "Job Intelligence Pipeline", payload: { normalizedJob, remoteClassification, clearanceSegment, certificationClassification, fitScore, applicationDifficultyScore, dashboardSegment }, confidence: eventType === "job.pipeline_completed" ? 1 : undefined });
      eventsEmitted.push(eventType);
    }
    stateStore.upsert({ projectionType: "job.dashboard_segment", entityType: "job", entityId: jobId, state: { jobId, normalizedJob, remoteClassification, clearanceSegment, certificationClassification, fitScore, applicationDifficultyScore, dashboardSegment, updatedBy: "job.pipeline_completed" }, updatedAt: new Date() });
    return { jobId, normalizedJob, remoteClassification, clearanceSegment, certificationClassification, fitScore, applicationDifficultyScore, dashboardSegment, eventsEmitted };
  } catch (error) {
    eventStore.append({ eventType: "job.pipeline_failed", entityType: "job", entityId: jobId, domain: "job-intelligence", manager: "Job Intelligence Pipeline", payload: { message: error instanceof Error ? error.message : "Unknown pipeline failure" }, confidence: 1 });
    throw error;
  }
}
