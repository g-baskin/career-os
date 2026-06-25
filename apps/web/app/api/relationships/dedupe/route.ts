import { dedupeRelationships } from "@career-os/domains";
export async function POST(request: Request) { const body = await request.json(); return Response.json({ relationships: dedupeRelationships(Array.isArray(body) ? body : body.people ?? []) }); }
