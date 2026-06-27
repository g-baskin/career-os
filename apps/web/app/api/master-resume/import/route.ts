import { importMasterResume } from "../_handlers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return importMasterResume(request);
}
