import { describe, expect, it } from "vitest";
import { upsertRelationshipPerson } from "../services";
describe("relationship dedupe", () => { it("dedupes by email", () => { const first = upsertRelationshipPerson({ name: "Bob Smith", company: "Agency", emails: ["bob@example.com"], roles: ["recruiter"] }); const second = upsertRelationshipPerson({ name: "Robert Smith", company: "Agency", emails: ["bob@example.com"], roles: ["referral"] }); expect(second.id).toBe(first.id); expect(second.roles.includes("referral")).toBe(true); }); });
