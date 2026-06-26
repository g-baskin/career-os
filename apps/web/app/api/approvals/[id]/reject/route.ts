import { localApprovalRequestService } from "@career-os/orchestration";
import { rejectApproval } from "../../_handlers";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return rejectApproval(localApprovalRequestService, params.id, request);
}
