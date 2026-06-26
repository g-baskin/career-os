import { describe, expect, it } from "vitest";
import { approvalsFromEnvelope, commandSummaryFromEnvelope, countApprovals } from "./approval-test-panel-model";

describe("approval test panel model", () => {
  it("counts pending, approved, rejected, and cancelled approvals", () => {
    const approvals = approvalsFromEnvelope({
      ok: true,
      data: {
        approvals: [
          { id: "approval-1", commandId: "command-1", commandType: "email.send", permission: "send_email", status: "pending", riskLevel: "critical", reason: "Needs approval", requestedAt: "2026-01-01T00:00:00.000Z" },
          { id: "approval-2", commandId: "command-2", commandType: "email.send", permission: "send_email", status: "approved", riskLevel: "critical", reason: "Needs approval", requestedAt: "2026-01-01T00:00:00.000Z" },
          { id: "approval-3", commandId: "command-3", commandType: "email.send", permission: "send_email", status: "rejected", riskLevel: "critical", reason: "Needs approval", requestedAt: "2026-01-01T00:00:00.000Z" },
          { id: "approval-4", commandId: "command-4", commandType: "email.send", permission: "send_email", status: "cancelled", riskLevel: "critical", reason: "Needs approval", requestedAt: "2026-01-01T00:00:00.000Z" }
        ]
      }
    });

    const counts = countApprovals(approvals);
    expect(counts.pending).toBe(1);
    expect(counts.approved).toBe(1);
    expect(counts.rejected).toBe(1);
    expect(counts.cancelled).toBe(1);
  });

  it("extracts requires-approval command results from response envelopes", () => {
    const summary = commandSummaryFromEnvelope({
      ok: false,
      error: { code: "APPROVAL_REQUIRED", message: "This command requires user approval." },
      command: { id: "command-1", status: "requires_approval", approvalRequestId: "approval-1" }
    });

    expect(summary?.ok).toBe(false);
    expect(summary?.commandId).toBe("command-1");
    expect(summary?.status).toBe("requires_approval");
    expect(summary?.approvalRequestId).toBe("approval-1");
    expect(summary?.errorCode).toBe("APPROVAL_REQUIRED");
    expect(summary?.errorMessage).toBe("This command requires user approval.");
  });

  it("extracts denied command results from response envelopes", () => {
    const summary = commandSummaryFromEnvelope({
      ok: false,
      error: { code: "COMMAND_DENIED", message: "Auto-submit is disabled by policy." },
      command: { id: "command-2", status: "rejected" }
    });

    expect(summary?.status).toBe("rejected");
    expect(summary?.errorCode).toBe("COMMAND_DENIED");
  });
});
