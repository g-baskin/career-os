# Enterprise Readiness Gaps

This project is a strong platform scaffold and local demo. Treat it as pre-production until the gaps below are closed.

## Current verified baseline

- `npm run typecheck` passes.
- `npm test` passes with 131 tests.
- `npm run lint` passes.
- `DATABASE_URL=... npx prisma validate` passes.
- `npm run build` is a required CI gate.
- Domain registry status is mostly planned: 49 placeholder domains, 11 partial domains, 1 implemented domain.

## Architecture gaps

- Define active product surface versus planned domains so placeholder domains are not mistaken for production features.
- Move route-specific schemas and handlers into reusable service modules where they need non-route exports.
- Add explicit domain ownership boundaries for commands, events, state projections, and side effects.
- Version public API contracts for `/api/*` routes before external clients use them.
- Add migration and seed workflows for local, staging, and production databases.

## Reliability gaps

- Wire real Postgres and Redis runtime paths in development, staging, and production.
- Add idempotency keys for every command that can create records or trigger side effects.
- Add BullMQ retry policies, backoff, dead-letter queues, and replay tooling.
- Add readiness checks for database, Redis, worker queues, and required configuration.
- Add graceful shutdown handling for web and worker processes.

## Security gaps

- Upgrade vulnerable dependencies reported by `npm audit`, especially Next.js and transitive PostCSS/Vite issues.
- Add authentication, session management, and role-based access control.
- Enforce permission policy checks at every sensitive command boundary.
- Add CSRF/abuse protections for browser-triggered mutations.
- Add secrets management for production instead of local `.env` conventions.
- Define PII retention, audit-log retention, export, and deletion policies.
- Encrypt sensitive data at rest where the deployment platform does not already provide it.

## Observability gaps

- Add structured JSON logs with request IDs, command IDs, user IDs, and trace IDs.
- Add metrics for route latency, command success/failure, queue depth, retries, and approval decisions.
- Add OpenTelemetry traces across route handler → command bus → orchestrator → domain manager → store.
- Add error reporting with release/environment tags.
- Add dashboards and alerts for failed commands, stuck approvals, queue backlog, and database errors.

## Testing gaps

- Add Playwright smoke tests for the dashboard, approvals flow, and Resume Factory demo.
- Add API contract tests for all route request/response envelopes.
- Add integration tests against disposable Postgres and Redis services.
- Add permission-policy regression tests for every sensitive command.
- Add build verification to CI so Next.js route export rules are caught before merge.

## Deployment gaps

- Add Dockerfiles or platform-specific deployment manifests for web and worker apps.
- Add staging and production environment definitions.
- Add database migration rollout and rollback runbooks.
- Add backup/restore verification for Postgres.
- Add release versioning, changelog, and rollback procedures.

## Maintainability gaps

- Keep `README.md` focused on how to run the app and move roadmap details into docs.
- Add ADRs for runtime deployment, auth/RBAC, queueing strategy, and observability stack.
- Add ownership metadata for each domain and package.
- Add dependency update policy and security patch SLA.
- Remove or mark demo-only code paths before production launch.

## Next concrete milestones

1. Keep CI green for install, Prisma validation, typecheck, tests, lint, and build.
2. Upgrade dependency stack until `npm audit --audit-level=high` passes without `continue-on-error`.
3. Add auth/RBAC and permission-policy integration tests for every mutation route.
4. Add Postgres/Redis-backed integration tests for command execution and worker queues.
5. Add production deployment manifests plus health/readiness endpoints.
