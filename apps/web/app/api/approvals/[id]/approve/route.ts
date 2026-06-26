import { localApprovalRequestService } from "@career-os/orchestration";
import { approveApproval } from "../../_handlers";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return approveApproval(localApprovalRequestService, params.id, request);
}
