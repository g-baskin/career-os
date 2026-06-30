import { prismaApprovalRequestService } from "@career-os/orchestration";
import { requireAuthenticatedCareerUser } from "../_lib/auth";
import { listApprovals } from "./_handlers";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await requireAuthenticatedCareerUser();
  return listApprovals(prismaApprovalRequestService, authUser);
}
