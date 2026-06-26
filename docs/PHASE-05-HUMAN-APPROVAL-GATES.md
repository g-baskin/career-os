# Phase 5 — Human Approval Gates

Phase 5 adds the first real control layer for Career OS.

Sensitive commands now pass through permission policy before any domain manager, worker, or tool executes.

## Execution path

```text
Command Bus
→ Orchestrator
→ Permission Policy
→ Approval Request Service when needed
→ Domain Manager only when allowed
→ Event Store
```

## Permission decisions

The permission policy returns one of:

- `allowed`
- `denied`
- `requires_approval`

Allowed commands execute normally.

Denied commands return `rejected` and do not execute.

Approval-required commands create an `ApprovalRequest`, emit approval lifecycle events, return `requires_approval`, and do not execute.

## Approval-required permissions

These permissions require approval by default:

- `send_email`
- `submit_application`
- `upload_file`
- `contact_recruiter`
- `contact_recruiter_first_time`
- `answer_sensitive_questions`
- `modify_master_profile`
- `use_browser`
- `export_document_for_submission`
- `auto_send_followup`
- `write_calendar`

Development-safe permissions currently allowed by default include `read_jobs`, `write_jobs`, `generate_resume`, `export_document`, `create_followup`, and `schedule_followup`.

## Approval lifecycle events

- `approval.requested`
- `approval.approved`
- `approval.rejected`
- `approval.expired`
- `approval.cancelled`
- `command.requires_approval`
- `command.approval_granted`
- `command.approval_denied`

## API routes

- `GET /api/approvals`
- `GET /api/approvals/:id`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`
- `POST /api/approvals/:id/cancel`

Local dev/demo routes exercise policy without real external actions:

- `POST /api/dev/commands/allowed` submits safe demo `jobs.run_pipeline` data and should complete.
- `POST /api/dev/commands/requires-approval` submits demo `email.send` data and should create a pending approval without sending email.
- `POST /api/dev/commands/denied` submits demo `application.auto_submit` data and should reject without submitting anything.

## UI

`/approvals` shows pending, approved, rejected, and cancelled approval requests with command type, permission, risk, reason, entity, requested date, and pending-request approve/reject/cancel actions.

The page also includes an Approval Test Panel with buttons for the allowed, requires-approval, and denied local demo commands.

## Local demo flow

1. Start the app with `npm run dev`.
2. Open `/approvals`.
3. Click **Run Allowed Test Command** and confirm no approval is created.
4. Click **Run Requires Approval Test Command** and confirm a pending approval appears.
5. Approve the pending approval.
6. Run the requires-approval test again, then reject or cancel the new pending approval.
7. Click **Run Denied Test Command** and confirm no pending approval is created for auto-submit.

## Trusted mode

Trusted mode placeholders exist, but trusted mode is disabled.

Auto-send and auto-submit remain disabled and are not implemented.

Approved-command replay is covered separately in `docs/PHASE-06-APPROVED-COMMAND-REPLAY.md`.

## Non-goals

This phase does not add Gmail sync, Calendar sync, browser automation, Chrome extension, LinkedIn scraping, email sending, document upload, recruiter outreach, or auto-submit behavior.
