import { eventStore } from "@career-os/events";
import { stateStore } from "@career-os/state";
import type { JobSegment, NormalizedJob } from "@career-os/shared";

export type ApplicationPacketStatus = "not_started" | "ready_to_generate" | "generated" | "awaiting_review" | "ready_to_apply" | "submitted" | "followup_due" | "closed";
export interface ApplicationPacketRecord { id: string; jobId: string; companyId?: string; personId?: string; selectedJob: NormalizedJob; selectedCompany?: { id?: string; name: string }; selectedPerson?: { id?: string; name: string; email?: string }; fitScoreSummary: { score: number; segment: JobSegment; highlights: string[] }; resumePlaceholder?: string; coverLetterPlaceholder?: string; recruiterMessagePlaceholder?: string; notes: string[]; status: ApplicationPacketStatus; nextAction: string; createdAt: string; updatedAt: string; }
export interface CreateApplicationPacketInput { jobId: string; companyId?: string; personId?: string; selectedJob: NormalizedJob; selectedCompany?: { id?: string; name: string }; selectedPerson?: { id?: string; name: string; email?: string }; fitScoreSummary: { score: number; segment: JobSegment; highlights?: string[] }; notes?: string[]; }
const packets = new Map<string, ApplicationPacketRecord>();
export function createApplicationPacket(input: CreateApplicationPacketInput): ApplicationPacketRecord {
  const now = new Date().toISOString();
  const packet: ApplicationPacketRecord = { id: `packet_${Date.now()}`, jobId: input.jobId, companyId: input.companyId, personId: input.personId, selectedJob: input.selectedJob, selectedCompany: input.selectedCompany, selectedPerson: input.selectedPerson, fitScoreSummary: { ...input.fitScoreSummary, highlights: input.fitScoreSummary.highlights ?? [] }, notes: input.notes ?? [], status: "ready_to_generate", nextAction: "Generate resume, cover letter, and recruiter message placeholders", createdAt: now, updatedAt: now };
  packets.set(packet.id, packet);
  eventStore.append({ eventType: "application_packet.created", entityType: "application_packet", entityId: packet.id, domain: "application-packet", manager: "Application Packet Manager", payload: packet, confidence: 1 });
  stateStore.upsert({ projectionType: "application_packet.current", entityType: "application_packet", entityId: packet.id, state: packet, updatedAt: new Date() });
  return packet;
}
export function listApplicationPackets() { return [...packets.values()]; }
export function getApplicationPacket(id: string) { return packets.get(id); }
export function generatePacketPlaceholders(id: string): ApplicationPacketRecord {
  const packet = packets.get(id);
  if (!packet) throw new Error(`Application packet not found: ${id}`);
  const updated: ApplicationPacketRecord = { ...packet, resumePlaceholder: `Technical resume placeholder for ${packet.selectedJob.title}; must be grounded in verified user profile facts before export.`, coverLetterPlaceholder: `Company-specific cover letter placeholder for ${packet.selectedCompany?.name ?? packet.selectedJob.company}; requires human review.`, recruiterMessagePlaceholder: packet.selectedPerson ? `Recruiter message placeholder for ${packet.selectedPerson.name}; approval required before sending.` : "Recruiter message placeholder; no recruiter selected yet.", status: "awaiting_review", nextAction: "Review placeholders and approve edits before applying", updatedAt: new Date().toISOString() };
  packets.set(id, updated);
  for (const eventType of ["resume.placeholder_created", "cover_letter.placeholder_created", "recruiter_message.placeholder_created", "application_packet.updated"]) eventStore.append({ eventType, entityType: "application_packet", entityId: id, domain: "application-packet", manager: "Application Packet Manager", payload: updated, confidence: 1 });
  stateStore.upsert({ projectionType: "application_packet.current", entityType: "application_packet", entityId: id, state: updated, updatedAt: new Date() });
  return updated;
}
