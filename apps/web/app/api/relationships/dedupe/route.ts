import { createCommand } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "../../_lib/auth";
import { executeCommandForReview } from "../../_lib/command-runtime";
import { commandResult } from "../../_lib/responses";

export async function POST(request: Request) {
  const authUser = await requireAuthenticatedCareerUser();
  const body = await request.json().catch(() => ({}));
  const command = createCommand({
    type: "relationships.dedupe",
    requestedBy: "api",
    userId: authUser.userId,
    entityType: "person",
    payload: Array.isArray(body) ? body : { people: body.people ?? [] }
  });
  const { result } = await executeCommandForReview(request, command);
  return commandResult(result, 200, 400);
}
