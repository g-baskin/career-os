import { eventStore } from "@career-os/events";
import { stateStore } from "@career-os/state";
export type PersonRole = "recruiter" | "hiring_manager" | "interviewer" | "referral" | "hr" | "unknown";
export interface RelationshipPerson { id: string; name: string; normalizedName: string; company?: string; emails: string[]; phones: string[]; roles: PersonRole[]; relevanceScore: number; responsivenessScore: number; trustScore: number; lastContactedAt?: string; nextFollowupAt?: string; }
export interface UpsertPersonInput { name: string; company?: string; emails?: string[]; phones?: string[]; roles?: PersonRole[]; lastContactedAt?: string; nextFollowupAt?: string; }
const people = new Map<string, RelationshipPerson>();
const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
function findDuplicate(input: UpsertPersonInput) {
  const emails = new Set((input.emails ?? []).map(normalize));
  const phones = new Set((input.phones ?? []).map((p) => p.replace(/\D/g, "")));
  const normalizedName = normalize(input.name);
  const company = input.company ? normalize(input.company) : undefined;
  return [...people.values()].find((person) => person.emails.some((email) => emails.has(normalize(email))) || person.phones.some((phone) => phones.has(phone.replace(/\D/g, ""))) || (person.normalizedName === normalizedName && normalize(person.company ?? "") === (company ?? "")));
}
export function upsertRelationshipPerson(input: UpsertPersonInput): RelationshipPerson {
  const duplicate = findDuplicate(input);
  const nowRoles = new Set<PersonRole>([...(duplicate?.roles ?? []), ...(input.roles ?? ["unknown"])]);
  const person: RelationshipPerson = { id: duplicate?.id ?? `person_${Date.now()}`, name: duplicate?.name ?? input.name, normalizedName: normalize(input.name), company: input.company ?? duplicate?.company, emails: [...new Set([...(duplicate?.emails ?? []), ...(input.emails ?? [])])], phones: [...new Set([...(duplicate?.phones ?? []), ...(input.phones ?? [])])], roles: [...nowRoles], relevanceScore: duplicate?.relevanceScore ?? 0, responsivenessScore: duplicate?.responsivenessScore ?? 0, trustScore: duplicate?.trustScore ?? 0, lastContactedAt: input.lastContactedAt ?? duplicate?.lastContactedAt, nextFollowupAt: input.nextFollowupAt ?? duplicate?.nextFollowupAt };
  people.set(person.id, person);
  eventStore.append({ eventType: duplicate ? "relationship.deduplicated" : "relationship.updated", entityType: "person", entityId: person.id, domain: "relationship-intelligence", manager: "Relationship Intelligence Manager", payload: { input, person, duplicateId: duplicate?.id }, confidence: duplicate ? 0.9 : 1 });
  stateStore.upsert({ projectionType: "relationship.person", entityType: "person", entityId: person.id, state: person, updatedAt: new Date() });
  return person;
}
export function listRelationshipPeople() { return [...people.values()]; }
export function getRelationshipPerson(id: string) { return people.get(id); }
export function dedupeRelationships(inputs: UpsertPersonInput[]) { return inputs.map(upsertRelationshipPerson); }
