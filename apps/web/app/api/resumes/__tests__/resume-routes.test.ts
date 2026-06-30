import { describe, expect, it } from "vitest";
import { POST } from "../route";
import { resumeGenerateRequestSchema } from "../schema";

describe("resume route schema", () => {
  it("accepts safe resume generation requests", () => {
    const parsed = resumeGenerateRequestSchema.safeParse({
      userId: "user-1",
      jobId: "job-1",
      companyId: "company-1",
      applicationPacketId: "packet-1",
      targetRole: "Splunk Terraform Engineer",
      verifiedFacts: ["Built Terraform modules for AWS observability workloads."]
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects requests without verified facts", () => {
    const parsed = resumeGenerateRequestSchema.safeParse({
      jobId: "job-1",
      companyId: "company-1",
      applicationPacketId: "packet-1",
      verifiedFacts: []
    });

    expect(parsed.success).toBe(false);
  });

  it("returns the expected failure envelope for invalid API payloads", async () => {
    const response = await POST(new Request("http://localhost/api/resumes", {
      method: "POST",
      body: JSON.stringify({ jobId: "job-1", companyId: "company-1", applicationPacketId: "packet-1", verifiedFacts: [] })
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INVALID_RESUME_REQUEST");
    expect(body.error.message).toBe("Invalid resume generation request.");
  });
});
