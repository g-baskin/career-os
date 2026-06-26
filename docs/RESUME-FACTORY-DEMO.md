# Resume Factory Demo

Use this page to test Resume Factory v1 visually without sending, uploading, submitting, or applying to anything.

## Run locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000/resumes
```

## Demo steps

1. Open `http://localhost:3000/resumes`.
2. Confirm the page title says `Resume Factory`.
3. Confirm the safety warning says the resume is a draft for local review only.
4. Click `Generate Demo Splunk/Cribl Resume`.
5. Confirm a command status appears.
6. Confirm a resume version ID appears.
7. Confirm a markdown resume preview appears.
8. Confirm truthfulness status appears.
9. Confirm keyword alignment appears.
10. Confirm CISSP, Security+, and clearance are not invented.
11. Confirm no email, upload, submit, or apply action happened.

## Expected keyword behavior

Verified matches should include:

- Splunk
- Cribl
- SIEM
- Linux
- Terraform
- AWS
- Azure
- GCP

Missing/preferred keywords should include:

- CISSP
- Security+

Blocked/no-claim keywords should include clearance-sensitive terms such as:

- active clearance
- Secret
- Top Secret
- TS/SCI
- Public Trust
- Polygraph

## Safety limits

The demo is intentionally API-backed and local-review-only.

It does not implement Gmail sync, Google Calendar sync, email sending, Chrome extension behavior, browser autofill, auto-submit, LinkedIn scraping, proxy scraping, CAPTCHA bypassing, recruiter outreach, document upload, external document submission, DOCX export polish, PDF export, or AI provider calls.
