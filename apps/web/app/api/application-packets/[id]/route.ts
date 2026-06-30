import { requireAuthenticatedCareerUser } from "../../_lib/auth";
import { getPersistentApplicationPacket } from "../../_lib/persistent-state";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const authUser = await requireAuthenticatedCareerUser();
  const packet = await getPersistentApplicationPacket(authUser.userId, params.id);
  return packet ? Response.json(packet) : Response.json({ error: "Not found" }, { status: 404 });
}
