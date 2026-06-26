import { createLocalApprovalDemoCommandBus, runAllowedCommand } from "../_handlers";

export async function POST() {
  return runAllowedCommand(createLocalApprovalDemoCommandBus());
}
