import { createCommand, createDefaultCommandBus, type CommandBus } from "@career-os/orchestration";
import { z } from "zod";
import { commandResult, fail } from "../_lib/responses";

export const masterResumeGetSchema = z.object({
  userId: z.string().min(1).default("demo-user")
});

export const masterResumeImportSchema = z.object({
  userId: z.string().min(1).default("demo-user"),
  resumeText: z.string().trim().min(1),
  source: z.string().trim().min(1).optional().default("pasted_plain_text")
});

type BusLike = Pick<CommandBus, "execute">;

function busOrDefault(bus?: BusLike) {
  return bus ?? createDefaultCommandBus();
}

export async function getMasterResume(request: Request, bus?: BusLike) {
  const query = masterResumeGetSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return fail("Invalid master resume query.", "INVALID_MASTER_RESUME_QUERY", 400);
  const command = createCommand({ type: "master_resume.get", requestedBy: "api", entityType: "user", entityId: query.data.userId, payload: query.data });
  return commandResult(await busOrDefault(bus).execute(command));
}

export async function importMasterResume(request: Request, bus?: BusLike) {
  const parsed = masterResumeImportSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid master resume import payload.", "INVALID_MASTER_RESUME_IMPORT", 400);
  const command = createCommand({ type: "master_resume.import", requestedBy: "api", entityType: "user", entityId: parsed.data.userId, payload: parsed.data });
  return commandResult(await busOrDefault(bus).execute(command), 201, 400);
}
