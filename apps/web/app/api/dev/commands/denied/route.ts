import { createLocalApprovalDemoCommandBus, runDeniedCommand } from "../_handlers";

export async function POST() {
  return runDeniedCommand(createLocalApprovalDemoCommandBus());
}
