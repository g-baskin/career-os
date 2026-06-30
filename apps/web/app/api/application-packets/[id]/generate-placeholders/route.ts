import { createCommand } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "../../../_lib/auth";
import { executeCommandForReview } from "../../../_lib/command-runtime";
import { commandResult } from "../../../_lib/responses";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const authUser = await requireAuthenticatedCareerUser();
  const command = createCommand({
    type: "application_packets.generate_placeholders",
    requestedBy: "api",
    userId: authUser.userId,
    entityType: "application_packet",
    entityId: params.id,
    payload: { id: params.id }
  });
  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 200, 404);
}
