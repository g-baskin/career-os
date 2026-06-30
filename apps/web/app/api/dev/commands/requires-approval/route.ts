import { createLocalApprovalDemoCommandBus, disabledLocalDemoRouteResponse, runRequiresApprovalCommand } from "../_handlers";

export async function POST() {
  const disabled = disabledLocalDemoRouteResponse();
  if (disabled) return disabled;
  return runRequiresApprovalCommand(createLocalApprovalDemoCommandBus());
}
