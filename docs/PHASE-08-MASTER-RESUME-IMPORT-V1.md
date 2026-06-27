# Phase 08 — Master Resume Import v1

## Goal

Master Resume Import v1 turns pasted plain-text resume content into candidate Profile Facts for human review.

It does not verify facts automatically.

It does not send email, upload files, use a browser, scrape LinkedIn, or submit applications.

## User flow

1. Open `/master-resume`.
2. Paste plain-text resume content.
3. Click `Import + Safety Blocks` for the recommended local demo path.
4. Review parsed candidate facts.
5. Verify supported facts that should become resume-allowed.
6. Block unsupported claims.
7. Open `/profile-facts` to confirm the source-of-truth state.
8. Open `/resumes` to generate a draft from verified facts only.

## Commands

| Command | Purpose | Permission |
|---|---|---|
| `master_resume.import` | Stores a pasted master resume and parses candidate facts. | `modify_master_profile` |
| `master_resume.get` | Reads the current master resume and review queue. | `modify_master_profile` |
| `profile_facts.verify` | Promotes a reviewed fact to verified/resume-allowed. | `modify_master_profile` |
| `profile_facts.block` | Blocks an unsupported claim. | `modify_master_profile` |

The current development policy allows local Profile Facts and Master Resume editing while stricter master-profile approval remains deferred.

## Events

- `master_resume.imported`
- `master_resume.parsed`
- `profile_fact.candidate_created`
- `profile_facts.review_queue_updated`

Every import captures a `master_resume.source_text` snapshot before parsed facts are projected.

## State projections

- `master_resume.current`
- `profile_facts.current`
- `profile_facts.review_queue`
- `profile_facts.resume_allowed`
- `profile_facts.blocked_claims`

## Truthfulness contract

Imported facts are created with:

- `sourceType: resume_import`
- `verificationStatus: needs_review`
- `allowedInResume: false`
- `allowedInCoverLetter: false`
- `allowedInRecruiterMessage: false`
- `requiresReview: true`

Resume Factory still reads only verified, resume-allowed Profile Facts.

Needs-review import facts cannot appear in resume drafts.

Blocked claims shadow duplicate candidates.

CISSP, Security+, and clearance claims are safety-blocked during import unless already present.

## Parser boundary

The parser is deterministic and whitelist-based.

It extracts known Splunk, Cribl, SIEM, log onboarding, cloud, Terraform, Linux, DevOps, observability, certification, and clearance terms.

It does not infer employers, dates, metrics, clearance, certifications, or accomplishments that are not explicitly present in the pasted text.

## API routes

- `GET /api/master-resume?userId=demo-user`
- `POST /api/master-resume/import`
- Existing `POST /api/profile-facts/[id]/verify`
- Existing `POST /api/profile-facts/[id]/block`

## Manual demo

```bash
npm run dev
```

Then:

1. Open `http://localhost:3000/master-resume`.
2. Use the sample text.
3. Click `Import + Safety Blocks`.
4. Confirm parsed Splunk/Cribl/Terraform facts appear as needs-review.
5. Confirm CISSP, Security+, and active clearance are skipped as blocked claims.
6. Verify one Splunk or Cribl fact.
7. Block one unsupported candidate if present.
8. Open `/profile-facts` and confirm state.
9. Open `/resumes`, generate a draft, and confirm only verified facts appear.

## Forbidden actions

This phase must not add:

- Gmail sync.
- Calendar sync.
- Email sending.
- Browser automation.
- Chrome extension code.
- LinkedIn scraping.
- Proxy scraping.
- CAPTCHA bypassing.
- External file upload.
- Job application submission.
- AI provider calls using private resume data.
