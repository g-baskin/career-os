import { prismaApprovalRequestService } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "../../../_lib/auth";
import { cancelApproval } from "../../_handlers";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const authUser = await requireAuthenticatedCareerUser();
  return cancelApproval(prismaApprovalRequestService, params.id, request, authUser);
}
