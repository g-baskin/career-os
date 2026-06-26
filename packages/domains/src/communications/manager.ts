import type { CareerCommand, CommandResult, DomainDefinition, DomainExecutionContext, DomainManagerContract } from "@career-os/shared";

export const definition: DomainDefinition = {
  name: "Communications Domain",
  slug: "communications",
  manager: "Communications Manager",
  capabilities: ["ApprovedEmailReplayCapability"],
  workers: ["ApprovedEmailReplayWorker"],
  tools: ["NoExternalEmailTool"],
  commands: ["communications.execute", "email.send"],
  events: ["communications.completed", "email.send.demo_replayed"],
  permissions: ["send_email"],
  dependencies: [],
  status: "partial",
  version: "0.1.0"
};

export class CommunicationsManager implements DomainManagerContract {
  readonly definition = definition;
  readonly domainName = definition.name;
  readonly domainSlug = definition.slug;
  readonly capabilities = [
    {
      name: "ApprovedEmailReplayCapability",
      workers: ["ApprovedEmailReplayWorker"],
      commands: ["email.send"],
      events: ["email.send.demo_replayed"],
      permissions: ["send_email"]
    }
  ];

  canHandle(command: CareerCommand) {
    return command.type === "email.send";
  }

  async handle(command: CareerCommand<Record<string, unknown>>, context: DomainExecutionContext): Promise<CommandResult> {
    const stateStore = context.stateStore as { upsertProjection?: (projection: unknown) => Promise<unknown> | unknown };
    const projection = await stateStore.upsertProjection?.({
      userId: command.userId,
      projectionType: "email.demo_replay",
      entityType: command.entityType ?? "email",
      entityId: command.entityId ?? command.id,
      data: {
        commandId: command.id,
        approvalRequestId: command.metadata?.approvalRequestId,
        to: command.payload.to,
        subject: command.payload.subject,
        status: "demo_replayed_no_external_send",
        externalActionTaken: false
      },
      updatedAt: new Date()
    });

    return {
      ok: true,
      status: "completed",
      commandId: command.id,
      data: {
        demoOnly: true,
        externalActionTaken: false,
        projection
      },
      emittedEvents: ["email.send.demo_replayed"],
      updatedProjections: ["email.demo_replay"]
    };
  }
}
