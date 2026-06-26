import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { InMemoryEventStore } from "@career-os/events";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { FileApprovalRequestService, InMemoryApprovalRequestService } from "../approvals";
import { createCommand } from "../command-bus";
import { createApprovedReplayCommandBus, createOrchestrator } from "../orchestrator";
import { PermissionPolicyService } from "../permissions";
import { ApprovalReplayService } from "../replay";

describe("InMemoryApprovalRequestService", () => {
  it("creates approval requests and prevents duplicate pending requests for a command", () => {
    const eventStore = new InMemoryEventStore();
    const approvals = new InMemoryApprovalRequestService(eventStore);
    const command = createCommand({ type: "email.send", requestedBy: "api", userId: "user-1", payload: { subject: "Hello" } });
    const decision = new PermissionPolicyService().evaluate(command);

    const first = approvals.createForCommand(command, decision);
    const second = approvals.createForCommand(command, decision);

    expect(first.id).toBe(second.id);
    expect(approvals.list().length).toBe(1);
    expect(eventStore.listByType("approval.requested").length).toBe(1);
  });

  it("approves approval requests and emits lifecycle events", () => {
    const eventStore = new InMemoryEventStore();
    const approvals = new InMemoryApprovalRequestService(eventStore);
    const command = createCommand({ type: "email.send", requestedBy: "api", userId: "user-1", payload: {} });
    const request = approvals.createForCommand(command, new PermissionPolicyService().evaluate(command));

    const approved = approvals.approve(request.id, { decidedBy: "user-1" });

    expect(approved?.status).toBe("approved");
    expect(eventStore.listByType("approval.approved").length).toBe(1);
    expect(eventStore.listByType("command.approval_granted").length).toBe(1);
  });

  it("rejects approval requests and emits lifecycle events", () => {
    const eventStore = new InMemoryEventStore();
    const approvals = new InMemoryApprovalRequestService(eventStore);
    const command = createCommand({ type: "email.send", requestedBy: "api", userId: "user-1", payload: {} });
    const request = approvals.createForCommand(command, new PermissionPolicyService().evaluate(command));

    const rejected = approvals.reject(request.id, { decidedBy: "user-1", reason: "Not now" });

    expect(rejected?.status).toBe("rejected");
    expect(eventStore.listByType("approval.rejected").length).toBe(1);
    expect(eventStore.listByType("command.approval_denied").length).toBe(1);
  });

  it("replays approved requests once and returns completed replay idempotently", async () => {
    const eventStore = new InMemoryEventStore();
    const stateStore = new InMemoryStateStore();
    const snapshotStore = new InMemorySnapshotStore();
    const approvals = new InMemoryApprovalRequestService(eventStore);
    const orchestrator = createOrchestrator({ eventStore, stateStore, snapshotStore, permissions: new PermissionPolicyService(), approvals });
    const replayService = new ApprovalReplayService(approvals, createApprovedReplayCommandBus(orchestrator));
    const command = createCommand({ type: "email.send", requestedBy: "api", userId: "user-1", entityType: "email", entityId: "email-1", payload: { to: "demo@example.invalid", subject: "Demo" } });
    const request = approvals.createForCommand(command, new PermissionPolicyService().evaluate(command));
    approvals.approve(request.id, { decidedBy: "user-1" });

    const first = await replayService.replay(request.id);
    const second = await replayService.replay(request.id);
    const finalApproval = approvals.getById(request.id);

    expect("replayed" in first ? first.replayed : false).toBe(true);
    expect("idempotent" in second ? second.idempotent : false).toBe(true);
    expect(finalApproval?.replayStatus).toBe("completed");
    expect(finalApproval?.replayAttemptCount).toBe(1);
    expect(eventStore.listByType("approval.replay_completed").length).toBe(1);
  });

  it("persists file-backed approval requests across service instances", () => {
    const filePath = join(tmpdir(), `career-os-approvals-test-${Date.now()}.json`);
    const firstService = new FileApprovalRequestService(filePath, new InMemoryEventStore());
    const command = createCommand({ type: "email.send", requestedBy: "api", userId: "user-1", payload: {} });
    const request = firstService.createForCommand(command, new PermissionPolicyService().evaluate(command));

    const secondService = new FileApprovalRequestService(filePath, new InMemoryEventStore());
    const persisted = secondService.getById(request.id);
    const approved = secondService.approve(request.id, { decidedBy: "user-1" });

    expect(persisted?.status).toBe("pending");
    expect(approved?.status).toBe("approved");
    expect(secondService.list().length).toBe(1);
    if (existsSync(filePath)) unlinkSync(filePath);
  });
});
