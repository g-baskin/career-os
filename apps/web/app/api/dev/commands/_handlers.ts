import { InMemoryEventStore } from "@career-os/events";
import { localApprovalRequestService, PermissionPolicyService, createCommand, createCommandBus, createOrchestrator, type CommandBus } from "@career-os/orchestration";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { commandResult, fail } from "../../_lib/responses";

export function disabledLocalDemoRouteResponse() {
  if (process.env.CAREER_OS_ENABLE_LOCAL_DEMO_ROUTES === "true") return undefined;
  return fail("Local demo routes are disabled in this runtime.", "LOCAL_DEMO_ROUTES_DISABLED", 404);
}

export function createLocalApprovalDemoCommandBus() {
  const eventStore = new InMemoryEventStore();
  const orchestrator = createOrchestrator({
    eventStore,
    stateStore: new InMemoryStateStore(),
    snapshotStore: new InMemorySnapshotStore(),
    permissions: new PermissionPolicyService(),
    approvals: localApprovalRequestService
  });
  return createCommandBus(orchestrator);
}

export async function runAllowedCommand(bus: CommandBus) {
  const command = createCommand({
    type: "jobs.run_pipeline",
    requestedBy: "api",
    userId: "local-user",
    entityType: "job",
    entityId: `dev-job-${Date.now()}`,
    payload: {
      title: "Dev Demo Platform Engineer",
      company: "Career OS Demo Company",
      location: "Remote",
      description: "Safe local demo role for Splunk Cribl Terraform AWS observability work.",
      source: "approval-demo"
    }
  });

  return commandResult(await bus.execute(command));
}

export async function runRequiresApprovalCommand(bus: CommandBus) {
  const command = createCommand({
    type: "email.send",
    requestedBy: "api",
    userId: "local-user",
    entityType: "email",
    entityId: `dev-email-${Date.now()}`,
    payload: {
      to: "demo@example.invalid",
      subject: "Approval demo only",
      body: "This payload is never sent. It exists only to exercise the approval gate."
    }
  });

  return commandResult(await bus.execute(command));
}

export async function runDeniedCommand(bus: CommandBus) {
  const command = createCommand({
    type: "application.auto_submit",
    requestedBy: "api",
    userId: "local-user",
    entityType: "application",
    entityId: `dev-application-${Date.now()}`,
    payload: {
      target: "approval-demo",
      note: "This payload is never submitted. It exists only to exercise denied policy."
    }
  });

  return commandResult(await bus.execute(command));
}
