import { requireAuthenticatedCareerUser } from "../_lib/auth";
import { listPersistentRelationshipPeople } from "../_lib/persistent-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await requireAuthenticatedCareerUser();
  const relationships = await listPersistentRelationshipPeople(authUser.userId);
  return Response.json({ relationships });
}
