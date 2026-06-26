# Phase 6 — Approved Command Replay

Phase 6 adds replay infrastructure for approved approval requests.

Replay stays inside the existing command boundary:

```text
Approval Service
→ Command Bus
→ Orchestrator approved replay path
→ Permission Policy approved-replay verification
→ Domain Manager
→ Event Store
→ State Store
```

## Replay rules

Only `approved` approval requests can be replayed.

`pending`, `rejected`, `cancelled`, and `expired` approvals return a rejected replay response.

Denied commands such as `application.auto_submit` are not replayable.

Replay never sends email, submits applications, uploads files, drives a browser, scrapes pages, or calls external APIs in this phase.

## Replay statuses

Approval requests track replay lifecycle with:

- `not_started`
- `in_progress`
- `completed`
- `failed`

Replay metadata is persisted on the approval request:

- `replayStatus`
- `replayedCommandId`
- `replayResult`
- `replayError`
- `replayAttemptCount`
- `replayedAt`

## Idempotency

A completed replay is idempotent.

Re-clicking replay for a completed approval returns the stored replay result instead of executing the command again.

An `in_progress` replay blocks duplicate execution.

A failed replay may be retried and increments `replayAttemptCount`.

## Events

Replay emits approval and command lifecycle events:

- `approval.replay_started`
- `approval.replay_completed`
- `approval.replay_failed`
- `command.replay_received`
- `command.replay_started`
- `command.replay_completed`
- `command.replay_failed`

Event payloads include approval request id, command id, command type, permission, replay status, replay command id, replay attempt count, entity type, entity id, and risk level where available.

## API

`POST /api/approvals/:id/replay` replays an approved request.

Success response:

```json
{
  "ok": true,
  "data": {
    "approval": {},
    "command": {},
    "replayed": true,
    "idempotent": false
  }
}
```

Error response:

```json
{
  "ok": false,
  "error": { "code": "APPROVAL_NOT_APPROVED", "message": "Only approved requests can be replayed." },
  "command": { "id": "command-id", "status": "rejected", "approvalRequestId": "approval-id" }
}
```

## Local demo flow

1. Start the app with `npm run dev`.
2. Open `/approvals`.
3. Click **Run Requires Approval Test Command**.
4. Approve the new pending request.
5. Click **Replay Approved Command**.
6. Confirm the replay status becomes `completed`.
7. Click **Replay Again (Idempotent)** and confirm the stored result is returned without a second execution.
8. Click **Run Denied Test Command** and confirm no replay control appears for denied auto-submit.

## Non-goals

This phase does not add Gmail sync, Calendar sync, browser automation, Chrome extension work, LinkedIn scraping, email sending, document upload, recruiter outreach, or auto-submit behavior.
