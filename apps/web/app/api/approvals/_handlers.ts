import { ApprovalReplayService, type ApprovalRequestService, type CommandBus } from "@career-os/orchestration";
import { z } from "zod";
import { fail, ok } from "../_lib/responses";

function isCommandResult(value: unknown): value is { ok: boolean; status: string; commandId: string; approvalRequestId?: string; error?: { code: string; message: string } } {
  return value !== null && typeof value === "object" && "ok" in value && "status" in value && "commandId" in value;
}

export const approvalDecisionSchema = z.object({
  decidedBy: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
  decisionPayload: z.unknown().optional()
});

export async function listApprovals(service: ApprovalRequestService) {
  const approvals = await service.list();
  return ok({ approvals });
}

export async function getApproval(service: ApprovalRequestService, id: string) {
  const approval = await service.getById(id);
  if (!approval) return fail("Approval request not found", "APPROVAL_NOT_FOUND", 404);
  return ok({ approval });
}

export async function approveApproval(service: ApprovalRequestService, id: string, request: Request) {
  const parsed = approvalDecisionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid approval decision payload", "INVALID_APPROVAL_DECISION", 400);
  const approval = await service.approve(id, parsed.data);
  if (!approval) return fail("Approval request not found", "APPROVAL_NOT_FOUND", 404);
  return ok({ approval });
}

export async function rejectApproval(service: ApprovalRequestService, id: string, request: Request) {
  const parsed = approvalDecisionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid approval decision payload", "INVALID_APPROVAL_DECISION", 400);
  const approval = await service.reject(id, parsed.data);
  if (!approval) return fail("Approval request not found", "APPROVAL_NOT_FOUND", 404);
  return ok({ approval });
}

export async function cancelApproval(service: ApprovalRequestService, id: string, request: Request) {
  const parsed = approvalDecisionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid approval decision payload", "INVALID_APPROVAL_DECISION", 400);
  const approval = await service.cancel(id, parsed.data);
  if (!approval) return fail("Approval request not found", "APPROVAL_NOT_FOUND", 404);
  return ok({ approval });
}

export async function replayApproval(service: ApprovalRequestService, bus: CommandBus, id: string) {
  const result = await new ApprovalReplayService(service, bus).replay(id);
  if (isCommandResult(result)) return Response.json({ ok: false, error: result.error, command: { id: result.commandId, status: result.status, approvalRequestId: result.approvalRequestId } }, { status: 400 });
  if (!result.command.ok) return Response.json({ ok: false, error: result.command.error, command: { id: result.command.commandId, status: result.command.status, approvalRequestId: result.approval.id } }, { status: 400 });
  return ok(result);
}
