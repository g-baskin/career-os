# Phase 7 — Resume Factory v1

Resume Factory v1 creates truthfulness-guarded resume drafts from verified facts only.

## Implemented

- `POST /api/resumes` submits `resume.generate` through the Command Bus and Orchestrator.
- `ResumeFactoryManager` builds deterministic SHA-256 draft IDs from stable draft input.
- `TechnicalResumeWorker` copies supplied verified facts into review-required resume markdown.
- `TruthfulnessGuardWorker` blocks draft bullets that do not exactly match verified facts.
- `resume.generated` events, `resume.current_draft` state projections, and `resume.source_input` snapshots preserve the generation trail.
- `/resumes` provides a local browser demo for a Splunk / Cribl Platform Engineer target role.

## Local demo

1. `npm run dev`
2. Open `http://localhost:3000/resumes`
3. Click `Generate Demo Splunk/Cribl Resume`
4. Confirm the resume preview appears.
5. Confirm truthfulness status appears.
6. Confirm CISSP, Security+, and clearance are not invented.
7. Confirm no email, upload, submit, or apply action happened.

## Demo payload

The `/resumes` page uses a safe commercial role payload:

```text
Target role: Splunk / Cribl Platform Engineer
Company: Demo Commercial Company
```

The job description includes Splunk, Cribl, SIEM, log onboarding, observability, Linux, Terraform, AWS, Azure, GCP, security data pipelines, CISSP, Security+, and no-clearance language.

Verified facts cover Splunk, Cribl, SIEM, Linux, Terraform, AWS, Azure, GCP, log onboarding, observability, and security data pipelines.

CISSP and Security+ remain missing/preferred keywords unless supplied as verified facts later.

Clearance claims remain blocked unless supplied as verified facts later.

## Safety boundary

Resume Factory v1 does not send email, upload files, submit applications, apply to jobs, scrape LinkedIn, bypass CAPTCHA, call Gmail, call Calendar, export PDF, polish DOCX, or call an AI provider.

The `/resumes` workspace is a demo/UI layer only; resume generation still flows through:

```text
UI → API → Command Bus → Orchestrator → Resume Factory Domain → Event/State/Snapshot stores
```
