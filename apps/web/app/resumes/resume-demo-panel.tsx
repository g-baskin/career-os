"use client";

import { useMemo, useState } from "react";
import {
  DEMO_COMPANY_NAME,
  DEMO_JOB_DESCRIPTION,
  DEMO_TARGET_ROLE,
  SAFETY_WARNINGS,
  buildKeywordAlignment,
  buildResumeDemoPayload,
  resumeResultFromEnvelope,
  type KeywordAlignmentView,
  type ResumeDemoFields,
  type ResumeDemoPayload,
  type ResumeResultView
} from "./resume-demo-panel-model";

async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

function ListCard({ title, items, emptyText }: { title: string; items: string[]; emptyText: string }) {
  return (
    <div className="card">
      <strong>{title}</strong>
      {items.length > 0 ? (
        <ul className="compact-list">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <p className="muted">{emptyText}</p>
      )}
    </div>
  );
}

function SafetyWarning() {
  return (
    <section className="section warning-card" aria-label="Safety warning">
      <h2>Safety Warning</h2>
      <ul className="compact-list">
        {SAFETY_WARNINGS.map((warning) => <li key={warning}>{warning}</li>)}
      </ul>
    </section>
  );
}

function LatestResult({ result, latestPayload }: { result?: ResumeResultView; latestPayload?: ResumeDemoPayload }) {
  if (!result) return <p className="muted">No resume generated yet. Run the demo generator to call POST /api/resumes.</p>;

  return (
    <div className="grid">
      <div className="card">
        <strong>Command status</strong>
        <p className="muted">{result.commandStatus ?? "unknown"}</p>
      </div>
      <div className="card">
        <strong>Resume version ID</strong>
        <p className="muted">{result.draft?.resumeVersionId ?? latestPayload?.resumeVersionId ?? "n/a"}</p>
      </div>
      <div className="card">
        <strong>Draft ID</strong>
        <p className="muted">{result.draft?.id ?? "n/a"}</p>
      </div>
      <div className="card">
        <strong>Target role</strong>
        <p className="muted">{latestPayload?.targetRole ?? "n/a"}</p>
      </div>
      <div className="card">
        <strong>Template key</strong>
        <p className="muted">technical-resume-v1</p>
      </div>
      <div className="card">
        <strong>Truthfulness status</strong>
        <p className="muted">{result.guard?.ok ? "passed" : "blocked or unavailable"}</p>
      </div>
      <div className="card">
        <strong>Source snapshot</strong>
        <p className="muted">{result.sourceSnapshotId ?? "n/a"}</p>
      </div>
    </div>
  );
}

function KeywordAlignment({ alignment }: { alignment: KeywordAlignmentView }) {
  return (
    <div className="grid">
      <ListCard title="Verified matches" items={alignment.verifiedMatches} emptyText="No verified keyword matches yet." />
      <ListCard title="Partial matches" items={alignment.partialMatches} emptyText="No partial matches in this demo response." />
      <ListCard title="Missing keywords" items={alignment.missingKeywords} emptyText="No missing keywords found." />
      <ListCard title="Blocked keywords" items={alignment.blockedKeywords} emptyText="No blocked keywords found." />
    </div>
  );
}

function TruthfulnessGuard({ result }: { result?: ResumeResultView }) {
  const guard = result?.guard;
  return (
    <div className="grid">
      <div className="card">
        <strong>Status</strong>
        <p className="muted">{guard ? (guard.ok ? "Passed: every draft bullet matched a verified fact." : "Blocked: unsupported claims detected.") : "Awaiting generation."}</p>
      </div>
      <ListCard title="Blocked claims" items={guard?.blockedClaims ?? []} emptyText="No blocked claims reported." />
      <ListCard title="Warnings" items={[...(result?.warnings ?? []), ...(guard?.warnings ?? [])]} emptyText="No warnings returned yet." />
      <ListCard title="Grounded claims" items={guard?.groundedClaims ?? []} emptyText="No grounded claims returned yet." />
    </div>
  );
}

function MarkdownPreview({ content }: { content?: string }) {
  if (!content) return <div className="card"><p className="muted">Resume markdown preview will appear here after generation.</p></div>;

  const blocks = content.split("\n");
  return (
    <div className="markdown-preview">
      {blocks.map((line, index) => {
        if (line.startsWith("## ")) return <h3 key={`${line}-${index}`}>{line.replace(/^##\s+/, "")}</h3>;
        if (line.startsWith("- ")) return <p className="preview-bullet" key={`${line}-${index}`}>• {line.replace(/^[-]\s+/, "")}</p>;
        if (!line.trim()) return <div className="preview-spacer" key={`space-${index}`} />;
        return <p key={`${line}-${index}`}>{line}</p>;
      })}
    </div>
  );
}

export default function ResumeDemoPanel() {
  const [fields, setFields] = useState<ResumeDemoFields>({
    targetRole: DEMO_TARGET_ROLE,
    companyName: DEMO_COMPANY_NAME,
    jobDescription: DEMO_JOB_DESCRIPTION
  });
  const [latestPayload, setLatestPayload] = useState<ResumeDemoPayload | undefined>(undefined);
  const [result, setResult] = useState<ResumeResultView | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to generate a local review draft.");

  const alignment = useMemo(() => buildKeywordAlignment(latestPayload ?? buildResumeDemoPayload(fields), result), [fields, latestPayload, result]);

  function updateField(field: keyof ResumeDemoFields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  async function generateDemoResume() {
    const payload = buildResumeDemoPayload(fields);
    setIsLoading(true);
    setLatestPayload(payload);
    setStatusMessage("Posting demo payload to /api/resumes through the existing Resume Factory command path...");

    try {
      const response = await fetch("/api/resumes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await readJson(response);
      const parsedResult = resumeResultFromEnvelope(body);
      setResult(parsedResult);

      if (!response.ok || parsedResult.errorMessage) {
        setStatusMessage(parsedResult.errorMessage ?? "Resume generation failed.");
        return;
      }

      setStatusMessage("Resume draft generated for local review only. No external action was taken.");
    } catch (error) {
      setResult({ reviewRequired: true, warnings: [], errorCode: "NETWORK_ERROR", errorMessage: error instanceof Error ? error.message : "Unknown network error." });
      setStatusMessage("Network/runtime error while calling /api/resumes.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <SafetyWarning />

      <section className="section">
        <h2>Demo Generator</h2>
        <div className="card form-card">
          <label>
            Target role
            <input value={fields.targetRole} onChange={(event) => updateField("targetRole", event.target.value)} />
          </label>
          <label>
            Company name
            <input value={fields.companyName} onChange={(event) => updateField("companyName", event.target.value)} />
          </label>
          <label>
            Job description
            <textarea rows={7} value={fields.jobDescription} onChange={(event) => updateField("jobDescription", event.target.value)} />
          </label>
          <button type="button" disabled={isLoading} onClick={() => void generateDemoResume()}>
            {isLoading ? "Generating Demo Resume..." : "Generate Demo Splunk/Cribl Resume"}
          </button>
          <p className="muted" aria-live="polite">{statusMessage}</p>
          {result?.errorMessage ? <p role="alert">{result.errorCode}: {result.errorMessage}</p> : null}
        </div>
      </section>

      <section className="section">
        <h2>Latest Result</h2>
        <LatestResult result={result} latestPayload={latestPayload} />
      </section>

      <section className="section">
        <h2>Keyword Alignment</h2>
        <KeywordAlignment alignment={alignment} />
      </section>

      <section className="section">
        <h2>Truthfulness Guard</h2>
        <TruthfulnessGuard result={result} />
      </section>

      <section className="section">
        <h2>Resume Preview</h2>
        <MarkdownPreview content={result?.draft?.content} />
      </section>
    </>
  );
}
