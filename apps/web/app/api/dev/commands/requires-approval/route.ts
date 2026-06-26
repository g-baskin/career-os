import { createLocalApprovalDemoCommandBus, runRequiresApprovalCommand } from "../_handlers";

export async function POST() {
  return runRequiresApprovalCommand(createLocalApprovalDemoCommandBus());
}
