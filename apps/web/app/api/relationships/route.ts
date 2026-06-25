import { listRelationshipPeople } from "@career-os/domains";
export async function GET() { return Response.json({ relationships: listRelationshipPeople() }); }
