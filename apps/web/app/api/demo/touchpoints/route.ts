import { getLocalDataTouchpoints, seedLocalDataTouchpoints } from "../../../_lib/local-data-runtime";
import { errorMessage, fail, ok } from "../../_lib/responses";

export const dynamic = "force-dynamic";

function disabledLocalDemoRouteResponse() {
  if (process.env.CAREER_OS_ENABLE_LOCAL_DEMO_ROUTES === "true") return undefined;
  return fail("Local demo routes are disabled in this runtime.", "LOCAL_DEMO_ROUTES_DISABLED", 404);
}

export async function GET() {
  const disabled = disabledLocalDemoRouteResponse();
  if (disabled) return disabled;

  try {
    return ok(await getLocalDataTouchpoints());
  } catch (error) {
    return fail(errorMessage(error), "DATA_TOUCHPOINTS_QUERY_FAILED", 500);
  }
}

export async function POST() {
  const disabled = disabledLocalDemoRouteResponse();
  if (disabled) return disabled;

  try {
    return ok(await seedLocalDataTouchpoints(), { status: 201 });
  } catch (error) {
    return fail(errorMessage(error), "DATA_TOUCHPOINTS_SEED_FAILED", 500);
  }
}
