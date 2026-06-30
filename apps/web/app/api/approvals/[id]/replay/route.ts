import { createApprovedReplayCommandBus, createDefaultOrchestrator, prismaApprovalRequestService } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "../../../_lib/auth";
import { replayApproval } from "../../_handlers";

function createPrismaReplayCommandBus() {
  return createApprovedReplayCommandBus(createDefaultOrchestrator());
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const authUser = await requireAuthenticatedCareerUser();
  return replayApproval(prismaApprovalRequestService, createPrismaReplayCommandBus(), params.id, authUser);
}
