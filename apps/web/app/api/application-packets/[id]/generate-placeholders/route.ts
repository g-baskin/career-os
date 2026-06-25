import { generatePacketPlaceholders } from "@career-os/domains";
export async function POST(_request: Request, { params }: { params: { id: string } }) { try { return Response.json(generatePacketPlaceholders(params.id)); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 404 }); } }
