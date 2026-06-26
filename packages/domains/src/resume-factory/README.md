# Resume Factory Domain

Resume Factory v1 generates review-required resume drafts from verified facts only.

## Commands

- `resume.generate` — creates a deterministic draft from `verifiedFacts`.
- `resume.generate_placeholder` — legacy alias that follows the same safe path and also emits `resume.placeholder_created`.

## Required input

```ts
{
  jobId: string;
  companyId: string;
  applicationPacketId: string;
  verifiedFacts: string[];
  resumeVersionId?: string;
  targetRole?: string;
  companyName?: string;
  jobDescription?: string;
  targetKeywords?: string[];
}
```

`verifiedFacts` must contain at least one non-empty fact.

The draft bullets are copied from those facts; Resume Factory v1 does not invent achievements, dates, tools, certifications, employers, clearance, or experience.

## Events

- `resume.generated` — emitted after the truthfulness guard passes.
- `resume.placeholder_created` — emitted only when the legacy alias command is used.

## State projection

- `resume.current_draft` on `application_packet:{applicationPacketId}` stores the latest draft, guard result, source snapshot id, and source event id.

## Snapshot

- `resume.source_input` on `application_packet:{applicationPacketId}` captures the original request used to generate the draft.

## Human review contract

Every generated draft returns `reviewRequired: true`.

The output is not submission-ready until the user reviews and approves it.

## Non-goals in v1

Resume Factory v1 does not send email, upload files, submit applications, run browser automation, scrape LinkedIn, call Gmail, call Calendar, export DOCX/PDF, or auto-submit anything.
