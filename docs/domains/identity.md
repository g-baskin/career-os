# Identity Domain

Identity owns the source-of-truth profile claims used by document generation.

## Status

Implemented for Profile Facts v1 and Master Resume Import v1.

## Commands

- `profile_facts.create`
- `profile_facts.update`
- `profile_facts.archive`
- `profile_facts.verify`
- `profile_facts.block`
- `profile_facts.list`
- `profile_facts.seed_initial`
- `master_resume.import`
- `master_resume.get`

## Events

- `profile_fact.created`
- `profile_fact.updated`
- `profile_fact.verified`
- `profile_fact.blocked`
- `profile_fact.archived`
- `profile_facts.seeded`
- `master_resume.imported`
- `master_resume.parsed`
- `profile_fact.candidate_created`
- `profile_facts.review_queue_updated`

## State projections

- `profile_facts.current`
- `profile_facts.review_queue`
- `profile_facts.resume_allowed`
- `profile_facts.blocked_claims`
- `master_resume.current`

## Master Resume Import v1

`/master-resume` accepts pasted plain text and routes through:

```text
UI → API → Command Bus → Orchestrator → Identity Manager → ProfileFactsCapability → Event/State/Snapshot stores
```

Imported resume claims become candidate Profile Facts only.

They are not resume-allowed until verified.

Blocked claims shadow duplicates, so CISSP, Security+, and clearance safety blocks still win.

## Parser boundary

The v1 parser is deterministic and whitelist-based.

It extracts explicit known terms such as Splunk, Cribl, SIEM, log onboarding, Linux, Terraform, cloud platforms, observability, selected certifications, and clearance terms.

It does not infer employment dates, companies, metrics, clearance status, or certifications.

## Safety

The Identity Domain does not send email, upload documents, use a browser, scrape LinkedIn, or submit applications.
