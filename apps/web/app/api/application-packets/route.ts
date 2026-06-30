import { createCommand } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "../_lib/auth";
import { executeCommandForReview } from "../_lib/command-runtime";
import { listPersistentApplicationPackets } from "../_lib/persistent-state";
import { commandResult } from "../_lib/responses";

export async function GET() {
  const authUser = await requireAuthenticatedCareerUser();
  const applicationPackets = await listPersistentApplicationPackets(authUser.userId);
  return Response.json({ ok: true, data: { applicationPackets } });
}

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();
  const body = await request.json().catch(() => ({}));
  const { userId: _ignoredUserId, ...payload } = body;
  const command = createCommand({
    type: "application_packets.create",
    requestedBy: "api",
    userId: authUser.userId,
    entityType: "job",
    entityId: payload.jobId,
    payload
  });
  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 201, 400);
}
