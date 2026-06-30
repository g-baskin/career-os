import { eventStore } from "@career-os/events";
import { createCommandBus, createDefaultCommandBus, createOrchestrator, InMemoryApprovalRequestService, PermissionPolicyService } from "@career-os/orchestration";
import { snapshotStore } from "@career-os/snapshots";
import type { CareerCommand, CommandResult } from "@career-os/shared";
import { stateStore } from "@career-os/state";

export interface CommandExecutionRuntime {
  result: CommandResult;
  runtime: "local-memory" | "prisma" | "local-memory-fallback";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function shouldUseLocalMemory() {
  return process.env.CAREER_OS_COMMAND_RUNTIME === "local-memory";
}

function shouldUseLocalFallback() {
  return false;
}

function isPrismaUnavailable(result: CommandResult) {
  if (result.ok || result.error?.code !== "COMMAND_HANDLER_FAILED") return false;
  const message = result.error.message.toLowerCase();
  return message.includes("can't reach database server") || message.includes("database server") || message.includes("p1001") || message.includes("localhost:55434");
}

function sanitizedPrismaUnavailableResult(result: CommandResult): CommandResult {
  return {
    ...result,
    error: { code: result.error?.code ?? "COMMAND_HANDLER_FAILED", message: "Persistent command store is unavailable." }
  };
}

export function createLocalReviewCommandBus() {
  return createCommandBus(createOrchestrator({
    eventStore,
    stateStore,
    snapshotStore,
    permissions: new PermissionPolicyService(),
    approvals: new InMemoryApprovalRequestService(eventStore)
  }));
}

export async function executeCommandForReview(_request: Request, command: CareerCommand): Promise<CommandExecutionRuntime> {
  if (shouldUseLocalMemory()) {
    return { result: await createLocalReviewCommandBus().execute(command), runtime: "local-memory" };
  }

  const result = await createDefaultCommandBus().execute(command);
  if (!isPrismaUnavailable(result)) return { result, runtime: "prisma" };
  if (!shouldUseLocalFallback()) return { result: sanitizedPrismaUnavailableResult(result), runtime: "prisma" };

  const fallbackCommand: CareerCommand = {
    ...command,
    metadata: {
      ...(isRecord(command.metadata) ? command.metadata : {}),
      localReviewFallback: true,
      originalFailureCode: result.error?.code
    }
  };
  return { result: await createLocalReviewCommandBus().execute(fallbackCommand), runtime: "local-memory-fallback" };
}
