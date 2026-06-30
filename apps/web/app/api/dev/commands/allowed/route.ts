import { createLocalApprovalDemoCommandBus, disabledLocalDemoRouteResponse, runAllowedCommand } from "../_handlers";

export async function POST() {
  const disabled = disabledLocalDemoRouteResponse();
  if (disabled) return disabled;
  return runAllowedCommand(createLocalApprovalDemoCommandBus());
}
