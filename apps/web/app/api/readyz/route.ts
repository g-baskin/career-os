import { prisma } from "@career-os/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, status: "ready", database: "reachable", timestamp: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database readiness check failed.";
    return Response.json({ ok: false, status: "not_ready", database: "unreachable", error: message }, { status: 503 });
  }
}
