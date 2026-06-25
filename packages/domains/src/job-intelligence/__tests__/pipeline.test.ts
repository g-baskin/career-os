import { describe, expect, it } from "vitest";
import { runJobPipeline } from "../pipeline";
describe("job pipeline", () => { it("processes a remote commercial Splunk role", async () => { const result = await runJobPipeline({ id: "seeded-job", title: "Splunk Platform Engineer", company: "ExampleCo", location: "Remote", description: "Splunk Cribl Terraform AWS observability", source: "test" }); expect(result.dashboardSegment).toBe("Remote Commercial"); expect(result.eventsEmitted.includes("job.pipeline_completed")).toBe(true); }); });
