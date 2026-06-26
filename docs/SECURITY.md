# SECURITY

This document captures the Career OS Phase 1 foundation from the PRD. The platform is organized as Domain → Manager → Capabilities → Workers → Tools → Events → State Projections → UI Workspaces.

- Event Store preserves permanent history.
- State Store maintains current truth.
- Snapshot Store preserves historical copies.
- Domain Registry lets managers, capabilities, workers, tools, commands, events, permissions, dependencies, status, and versions evolve without changing the orchestrator.
- Human approval is required for sensitive actions; auto-submit and LinkedIn scraping are not implemented.

## Human approval gates

The Orchestrator evaluates permission policy before command execution.

Allowed commands execute normally. Denied commands return `rejected`. Sensitive commands create an `ApprovalRequest`, emit `approval.requested` plus `command.requires_approval`, and return without executing tools.

Sensitive permissions require approval by default:

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

Trusted mode placeholders exist but remain disabled: auto-send and auto-submit are not implemented.

Dev/demo approval routes may exercise allowed, approval-required, denied, and approved-replay command paths locally. They must remain side-effect free: no email sending, browser automation, file upload, or application submission.

Approved replay requires an `approved` approval request and matching approval permission metadata. Completed replay is idempotent and returns the stored replay result. Demo `email.send` replay records `externalActionTaken: false`; denied `application.auto_submit` commands are not replayable.
