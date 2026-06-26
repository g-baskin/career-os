import { InMemoryEventStore } from "@career-os/events";
import { InMemorySnapshotStore } from "@career-os/snapshots";
import { InMemoryStateStore } from "@career-os/state";
import { describe, expect, it } from "vitest";
import { ResumeFactoryManager } from "../manager";

function command(payload: Record<string, unknown>) {
  return {
    id: "command-resume-1",
    type: "resume.generate",
    requestedBy: "api" as const,
    userId: "user-1",
    entityType: "application_packet",
    entityId: String(payload.applicationPacketId ?? "packet-1"),
    payload,
    createdAt: new Date().toISOString()
  };
}

function createContext() {
  return {
    eventStore: new InMemoryEventStore(),
    stateStore: new InMemoryStateStore(),
    snapshotStore: new InMemorySnapshotStore()
  };
}

const verifiedFacts = [
  "Built Terraform modules for AWS observability workloads.",
  "Administered Splunk and Cribl pipelines for production telemetry.",
  "Led incident reviews with engineering teams."
];

describe("ResumeFactoryManager", () => {
  it("generates a review-required draft only from verified facts", async () => {
    const manager = new ResumeFactoryManager();
    const context = createContext();

    const result = await manager.handle(
      command({
        jobId: "job-1",
        companyId: "company-1",
        applicationPacketId: "packet-1",
        targetRole: "Splunk Terraform Engineer",
        verifiedFacts
      }),
      context
    );

    expect(result.ok).toBe(true);
    expect(result.data?.reviewRequired).toBe(true);
    expect(JSON.stringify(result.data?.draft.sourceFacts)).toBe(JSON.stringify(verifiedFacts));
    expect(result.data?.draft.content.includes("Built Terraform modules for AWS observability workloads.")).toBe(true);
    expect(result.data?.draft.content.includes("Administered Splunk and Cribl pipelines for production telemetry.")).toBe(true);
    expect(result.data?.draft.content.includes("Kubernetes")).toBe(false);
    expect(JSON.stringify(result.data?.guard.blockedClaims)).toBe(JSON.stringify([]));
  });

  it("rejects generation when verified facts are empty", async () => {
    const manager = new ResumeFactoryManager();
    const context = createContext();

    const result = await manager.handle(
      command({ jobId: "job-1", companyId: "company-1", applicationPacketId: "packet-1", verifiedFacts: [] }),
      context
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe("rejected");
    expect(result.error?.code).toBe("VERIFIED_FACTS_REQUIRED");
    expect(context.eventStore.listByType("resume.generated").length).toBe(0);
  });

  it("emits resume.generated, writes resume.current_draft, and captures resume.source_input", async () => {
    const manager = new ResumeFactoryManager();
    const context = createContext();

    const result = await manager.handle(
      command({ jobId: "job-1", companyId: "company-1", applicationPacketId: "packet-1", verifiedFacts }),
      context
    );

    const generatedEvents = context.eventStore.listByType("resume.generated");
    const projection = context.stateStore.getProjection("application_packet", "packet-1", "resume.current_draft");
    const snapshots = context.snapshotStore.listBySnapshotType("resume.source_input");

    expect(result.ok).toBe(true);
    expect(generatedEvents.length).toBe(1);
    expect(projection?.projectionType).toBe("resume.current_draft");
    expect(snapshots.length).toBe(1);
    expect(result.data?.sourceSnapshotId).toBe(snapshots[0]?.id);
  });

  it("does not emit forbidden external-action events", async () => {
    const manager = new ResumeFactoryManager();
    const context = createContext();

    await manager.handle(
      command({ jobId: "job-1", companyId: "company-1", applicationPacketId: "packet-1", verifiedFacts }),
      context
    );

    const emittedTypes = context.eventStore.listRecent(50).map((event) => event.eventType);

    expect(emittedTypes.includes("email.sent")).toBe(false);
    expect(emittedTypes.includes("application.submitted")).toBe(false);
    expect(emittedTypes.includes("file.uploaded")).toBe(false);
    expect(emittedTypes.includes("browser.used")).toBe(false);
    expect(emittedTypes.includes("linkedin.scraped")).toBe(false);
  });
});
