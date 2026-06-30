import { prismaApprovalRequestService } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "../../_lib/auth";
import { getApproval } from "../_handlers";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const authUser = await requireAuthenticatedCareerUser();
  return getApproval(prismaApprovalRequestService, params.id, authUser);
}
