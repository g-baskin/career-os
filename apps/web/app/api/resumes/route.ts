import { createCommand } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "../_lib/auth";
import { executeCommandForReview } from "../_lib/command-runtime";
import { commandResult, fail } from "../_lib/responses";
import { resumeGenerateRequestSchema } from "./schema";

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();
  const parsed = resumeGenerateRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return fail("Invalid resume generation request.", "INVALID_RESUME_REQUEST", 400);
  }

  const { userId: _ignoredUserId, ...payload } = parsed.data;
  const command = createCommand({
    type: "resume.generate",
    requestedBy: "api",
    userId: authUser.userId,
    entityType: "application_packet",
    entityId: payload.applicationPacketId,
    payload
  });

  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 201, 400);
}
