import { describe, expect, it } from "vitest";
import { createApplicationPacket, generatePacketPlaceholders } from "../services";
describe("application packet service", () => { it("creates placeholders", () => { const packet = createApplicationPacket({ jobId: "job-1", selectedJob: { title: "SRE", company: "ExampleCo", source: "test", raw: {} }, fitScoreSummary: { score: 80, segment: "Remote Commercial" } }); const generated = generatePacketPlaceholders(packet.id); expect(generated.status).toBe("awaiting_review"); }); });
