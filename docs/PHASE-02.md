# Phase 2 — Job Intelligence + Application Factory

Phase 2 connects Phase 1 primitives into workflow services while preserving the existing Domain → Manager → Capability → Worker → Tool → Event → State Projection → UI Workspace architecture.

## Built

- Job Intelligence Pipeline: import/collect, normalize, remote classify, clearance segment, certification classify, fit score, application difficulty score, assign dashboard segment, emit events, and update state projections.
- Application Packet service: creates packets from selected jobs/companies/people, stores fit summaries, notes, status, next action, and generates resume, cover letter, and recruiter message placeholders.
- Resume Factory placeholders: `ResumeFactoryManager`, `ResumeGenerationCapability`, `TechnicalResumeWorker`, `TruthfulnessGuardWorker`, `DocxExportWorker`, and `PdfExportWorker` placeholders.
- Cover Letter placeholders: `CoverLetterManager`, `CoverLetterGenerationCapability`, `CompanySpecificCoverLetterWorker`, `ShortCoverLetterWorker`, and `NoCoverLetterDecisionWorker` placeholders.
- Relationship Intelligence: deduplicates people by email, normalized name + company, and phone number; supports multiple roles and scoring placeholders.
- Daily Mission v2: packet and segmentation sections for top remote, hybrid, onsite, clearance/government, low-fit, packet generation, awaiting review, follow-ups, and estimated apply time.
- API routes for job pipeline, application packets, placeholder generation, relationships, dedupe, and daily mission.

## Still placeholder

No auto-submit, Gmail sync/sending, Google Calendar sync, Chrome extension, browser form filling, LinkedIn scraping, proxy scraping, or CAPTCHA bypassing is implemented.
