import { describe, expect, it } from "vitest";
import { resumeGenerateRequestSchema } from "../route";

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
});
