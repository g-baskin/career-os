import { requireAuthenticatedCareerUser } from "../_lib/auth";
import { listPersistentApplicationPackets, listPersistentJobDashboardProjections } from "../_lib/persistent-state";

export const dynamic = "force-dynamic";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function projectionData(projection: { data: unknown }) {
  return isRecord(projection.data) ? projection.data : {};
}

function bySegment(projections: Array<{ data: unknown }>, segment: string) {
  return projections.map(projectionData).filter((data) => data.dashboardSegment === segment);
}

export async function GET() {
  const authUser = await requireAuthenticatedCareerUser();
  const packets = await listPersistentApplicationPackets(authUser.userId);
  const jobProjections = await listPersistentJobDashboardProjections(authUser.userId);

  return Response.json({
    topRemoteCommercialJobs: bySegment(jobProjections, "Remote Commercial"),
    hybridCommercialJobs: bySegment(jobProjections, "Hybrid Commercial"),
    onsiteCommercialJobs: bySegment(jobProjections, "Onsite Commercial"),
    clearanceGovernmentSeparatedJobs: bySegment(jobProjections, "Clearance / Government"),
    lowFitJobs: bySegment(jobProjections, "Low Fit"),
    jobsReadyForPacketGeneration: bySegment(jobProjections, "Remote Commercial"),
    packetsAwaitingReview: packets.filter((packet) => packet.status === "awaiting_review"),
    followupsDuePlaceholder: [],
    estimatedApplyTimePlaceholder: jobProjections.length > 0 ? "Estimated from application difficulty projections" : "TBD after application difficulty scoring"
  });
}
