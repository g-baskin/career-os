import { InMemoryEventStore } from "@career-os/events";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { InMemoryApprovalRequestService, PermissionPolicyService, createApprovedReplayCommandBus, createCommand, createOrchestrator } from "@career-os/orchestration";
import { describe, expect, it } from "vitest";
import { approveApproval, cancelApproval, getApproval, listApprovals, rejectApproval, replayApproval } from "../_handlers";

const authUser = { userId: "user-1", email: "user-1@example.invalid", name: "Test User" };

function createApprovalService() {
  const eventStore = new InMemoryEventStore();
  const service = new InMemoryApprovalRequestService(eventStore);
  const command = createCommand({ type: "email.send", requestedBy: "api", userId: authUser.userId, payload: {} });
  const approval = service.createForCommand(command, new PermissionPolicyService().evaluate(command));
  return { service, approval };
}

describe("approval API handlers", () => {
  it("lists approvals", async () => {
    const { service } = createApprovalService();

    const response = await listApprovals(service, authUser);
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.approvals.length).toBe(1);
  });

  it("gets one approval", async () => {
    const { service, approval } = createApprovalService();

    const response = await getApproval(service, approval.id, authUser);
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.approval.id).toBe(approval.id);
  });

  it("returns structured error for missing approval", async () => {
    const { service } = createApprovalService();

    const response = await getApproval(service, "missing", authUser);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("APPROVAL_NOT_FOUND");
  });

  it("approves approval requests", async () => {
    const { service, approval } = createApprovalService();

    const response = await approveApproval(service, approval.id, new Request("http://localhost/api/approvals/approve", { method: "POST", body: JSON.stringify({ decidedBy: authUser.userId }) }), authUser);
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.approval.status).toBe("approved");
  });

  it("rejects approval requests", async () => {
    const { service, approval } = createApprovalService();

    const response = await rejectApproval(service, approval.id, new Request("http://localhost/api/approvals/reject", { method: "POST", body: JSON.stringify({ reason: "No" }) }), authUser);
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.approval.status).toBe("rejected");
  });

  it("replays approved approval requests", async () => {
    const eventStore = new InMemoryEventStore();
    const service = new InMemoryApprovalRequestService(eventStore);
    const orchestrator = createOrchestrator({ eventStore, stateStore: new InMemoryStateStore(), snapshotStore: new InMemorySnapshotStore(), permissions: new PermissionPolicyService(), approvals: service });
    const command = createCommand({ type: "email.send", requestedBy: "api", userId: authUser.userId, entityType: "email", entityId: "email-1", payload: { to: "demo@example.invalid" } });
    const approval = service.createForCommand(command, new PermissionPolicyService().evaluate(command));
    service.approve(approval.id, { decidedBy: authUser.userId });

    const response = await replayApproval(service, createApprovedReplayCommandBus(orchestrator), approval.id, authUser);
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.command.status).toBe("completed");
    expect(body.data.approval.replayStatus).toBe("completed");
  });

  it("cancels approval requests", async () => {
    const { service, approval } = createApprovalService();

    const response = await cancelApproval(service, approval.id, new Request("http://localhost/api/approvals/cancel", { method: "POST", body: JSON.stringify({ reason: "Cancel" }) }), authUser);
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(body.data.approval.status).toBe("cancelled");
  });
});
