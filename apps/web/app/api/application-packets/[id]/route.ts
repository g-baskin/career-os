import { getApplicationPacket } from "@career-os/domains";
export async function GET(_request: Request, { params }: { params: { id: string } }) { const packet = getApplicationPacket(params.id); return packet ? Response.json(packet) : Response.json({ error: "Not found" }, { status: 404 }); }
