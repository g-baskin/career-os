# ADR-0004: Use Human Approval Gates for Sensitive Career OS Actions

## Status

Accepted

## Context

Career OS can classify jobs, build application packets, route commands, emit durable events, and update state projections.

Before adding Gmail, Calendar, Browser Copilot, recruiter outreach, document export, or application submission features, the platform needs a reusable control layer. Sensitive commands must not execute automatically from API routes, workers, or UI actions.

## Decision

Use Human Approval Gates for sensitive Career OS actions.

The Orchestrator evaluates every command through a permission policy before execution. The policy returns `allowed`, `denied`, or `requires_approval`.

Allowed commands execute normally. Denied commands return a rejected command result. Approval-required commands create an `ApprovalRequest`, emit approval lifecycle events, return `requires_approval`, and do not execute tools.

Sensitive permissions require approval by default, including email sending, application submission, file upload, recruiter contact, first-time recruiter contact, sensitive-question answering, master-profile modification, browser use, submission-bound document export, auto-send follow-up, and calendar writes.

Trusted mode placeholders exist, but trusted mode remains disabled.

Local demo commands may exercise `jobs.run_pipeline`, `email.send`, and `application.auto_submit` through the Command Bus and Orchestrator. They are policy demonstrations only: the email command stops at `requires_approval`, and auto-submit is rejected before any external action can run.

## Consequences

Sensitive future features must integrate through the command/orchestrator boundary.

Approval state becomes auditable through events and ApprovalRequest records.

API routes stay thin and do not contain one-off approval logic.

The platform gains a safe place to later attach resumable command replay after approval.

The `/approvals` workspace can approve, reject, or cancel pending approvals and can trigger local demo commands for manual verification.

## Alternatives considered

### UI-only confirmation dialogs

Rejected because API routes and workers could bypass UI checks.

### Domain-specific approval logic

Rejected because each domain would drift and sensitive actions would be inconsistently gated.

### Trusted mode now

Rejected because trusted mode requires stronger product controls, audit review, and user-facing settings before it can be safe.

## Follow-up decision

ADR-0005 adds approved-command replay with idempotency guards while keeping external actions disabled.
