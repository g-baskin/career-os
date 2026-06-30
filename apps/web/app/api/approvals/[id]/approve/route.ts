import { prismaApprovalRequestService } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "../../../_lib/auth";
import { approveApproval } from "../../_handlers";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const authUser = await requireAuthenticatedCareerUser();
  return approveApproval(prismaApprovalRequestService, params.id, request, authUser);
}
