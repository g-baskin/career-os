import { getMasterResume } from "./_handlers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return getMasterResume(request);
}
