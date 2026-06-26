# ADR-0005: Use Approved Command Replay with Idempotency Guards

## Status

Accepted

## Context

Career OS now creates persistent approval requests for sensitive commands and prevents those commands from executing automatically.

After a human approves an approval request, the platform needs a controlled way to resume the original command without bypassing the Orchestrator, permission policy, event store, or state projections.

Replay must be safe for local development and must not introduce real external actions such as email sending, application submission, file upload, browser automation, scraping, or calendar writes.

## Decision

Use Approved Command Replay with idempotency guards.

Replay starts from the Approval Service, rebuilds the original command from the `ApprovalRequest`, adds approval replay metadata, submits the command through a Command Bus whose handler calls the Orchestrator approved replay path, verifies the approval metadata in Permission Policy, then routes to the owning Domain Manager.

Replay status and results are persisted on `ApprovalRequest` using `replayStatus`, `replayedCommandId`, `replayResult`, `replayError`, `replayAttemptCount`, and `replayedAt`.

Completed replay is idempotent: subsequent replay calls return the stored replay result instead of executing the command again.

The current `email.send` replay behavior is demo-only. It updates an `email.demo_replay` state projection and returns `externalActionTaken: false`.

Denied commands such as `application.auto_submit` are not replayed.

## Consequences

Approved command replay remains auditable through approval replay events and command replay events.

The system keeps the existing Domain → Manager → Capability → Worker → Tool → Event → State Projection → UI Workspace shape.

Replay can later be extended to durable queues or real external actions only after stronger product controls and explicit user-facing safety settings exist.

The approval API gains `POST /api/approvals/:id/replay`, and the `/approvals` workspace can manually replay approved requests.

## Alternatives considered

### Execute directly from approval API route

Rejected because it would bypass the Command Bus, Orchestrator, permission policy, events, and state projections.

### Mark approvals as approved and let workers poll implicitly

Rejected because implicit worker polling makes idempotency and audit trails harder to reason about in this foundation phase.

### Execute real email send after approval

Rejected for this phase because external actions require provider setup, user-facing safety settings, secrets management, delivery audit, and rollback policy.
