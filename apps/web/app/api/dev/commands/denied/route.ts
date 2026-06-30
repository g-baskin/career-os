import { createLocalApprovalDemoCommandBus, disabledLocalDemoRouteResponse, runDeniedCommand } from "../_handlers";

export async function POST() {
  const disabled = disabledLocalDemoRouteResponse();
  if (disabled) return disabled;
  return runDeniedCommand(createLocalApprovalDemoCommandBus());
}
