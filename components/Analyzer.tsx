"use client";

import { useEffect, useState } from "react";
import {
  MEDDPICC_ELEMENTS,
  type EmailDraft,
  type MeddpiccElementResult,
  type Risk,
} from "@/lib/meddpicc";
import { EXAMPLE_TRANSCRIPT, EXAMPLE_NOTES } from "@/lib/example";

// Persist the rep's work so an accidental refresh doesn't lose it.
const STORAGE_KEY = "meddpicc-analyzer:v1";

// Above this length we warn that a very long call may be slow or hit the
// model's output limit. Roughly a long (60-min+) transcript.
const LONG_TRANSCRIPT_CHARS = 50_000;

// Each MEDDPICC element gets its own color so the grid is colorful and scannable.
// Full literal class strings (no interpolation) so they're always generated.
interface ElementTheme {
  bar: string; // top accent border
  dot: string; // status dot (found)
  dotMuted: string; // status dot (not addressed)
  title: string; // element name color
  pill: string; // "Found" badge bg/text/ring
}

const ELEMENT_THEME_DEFAULT: ElementTheme = {
  bar: "border-t-indigo-400",
  dot: "bg-indigo-500",
  dotMuted: "bg-indigo-200",
  title: "text-indigo-800",
  pill: "bg-indigo-50 text-indigo-700 ring-indigo-100",
};

const ELEMENT_THEME: Record<string, ElementTheme> = {
  Metrics: {
    bar: "border-t-indigo-400",
    dot: "bg-indigo-500",
    dotMuted: "bg-indigo-200",
    title: "text-indigo-800",
    pill: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  },
  "Economic Buyer": {
    bar: "border-t-sky-400",
    dot: "bg-sky-500",
    dotMuted: "bg-sky-200",
    title: "text-sky-800",
    pill: "bg-sky-50 text-sky-700 ring-sky-100",
  },
  "Decision Criteria": {
    bar: "border-t-teal-400",
    dot: "bg-teal-500",
    dotMuted: "bg-teal-200",
    title: "text-teal-800",
    pill: "bg-teal-50 text-teal-700 ring-teal-100",
  },
  "Decision Process": {
    bar: "border-t-emerald-400",
    dot: "bg-emerald-500",
    dotMuted: "bg-emerald-200",
    title: "text-emerald-800",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  "Paper Process": {
    bar: "border-t-amber-400",
    dot: "bg-amber-500",
    dotMuted: "bg-amber-200",
    title: "text-amber-800",
    pill: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  "Identify Pain": {
    bar: "border-t-rose-400",
    dot: "bg-rose-500",
    dotMuted: "bg-rose-200",
    title: "text-rose-800",
    pill: "bg-rose-50 text-rose-700 ring-rose-100",
  },
  Champion: {
    bar: "border-t-violet-400",
    dot: "bg-violet-500",
    dotMuted: "bg-violet-200",
    title: "text-violet-800",
    pill: "bg-violet-50 text-violet-700 ring-violet-100",
  },
  Competition: {
    bar: "border-t-orange-400",
    dot: "bg-orange-500",
    dotMuted: "bg-orange-200",
    title: "text-orange-800",
    pill: "bg-orange-50 text-orange-700 ring-orange-100",
  },
};

function definitionFor(element: string): string {
  return MEDDPICC_ELEMENTS.find((e) => e.key === element)?.definition ?? "";
}

// Build a CRM-ready plain-text summary: the 8 elements with their stakeholders
// and evidence, plus the risks and a consolidated next-steps list. Kept as plain
// text with simple indentation so it pastes cleanly into a Salesforce note.
function buildSalesforceText(
  cards: MeddpiccElementResult[],
  risks: Risk[],
): string {
  const foundCount = cards.filter((c) => c.status === "found").length;
  const sections: string[] = [`MEDDPICC SUMMARY (${foundCount} of 8 found)`, ""];

  for (const c of cards) {
    if (c.status === "found") {
      sections.push(`${c.element}: ${c.value.trim()}`);
      if (c.people.length > 0) {
        const who = c.people
          .map((p) => (p.title ? `${p.name} (${p.title})` : p.name))
          .join(", ");
        sections.push(`  Stakeholders: ${who}`);
      }
      if (c.evidence.trim()) {
        sections.push(`  Evidence: "${c.evidence.trim()}"`);
      }
    } else {
      sections.push(`${c.element}: (not addressed on this call)`);
    }
  }

  if (risks.length > 0) {
    sections.push("", "RISKS & RED FLAGS");
    for (const r of risks) {
      const sev = r.severity === "high" ? "[HIGH] " : "";
      const detail = r.detail.trim() ? ` — ${r.detail.trim()}` : "";
      sections.push(`- ${sev}${r.title.trim()}${detail}`);
    }
  }

  // Pull the suggested questions from the elements the call didn't cover into
  // one prioritized "ask next" list.
  const nextSteps = cards
    .filter((c) => c.status !== "found" && c.nextQuestion.trim())
    .map((c) => `- ${c.nextQuestion.trim()}`);
  if (nextSteps.length > 0) {
    sections.push("", "RECOMMENDED NEXT STEPS", ...nextSteps);
  }

  return sections.join("\n");
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

interface ElementCardProps {
  result: MeddpiccElementResult;
  onValueChange: (value: string) => void;
  onCopy: (text: string, key: string) => void;
  copiedKey: string | null;
}

// Module-scope so the editable textarea keeps focus across re-renders.
function ElementCard({
  result,
  onValueChange,
  onCopy,
  copiedKey,
}: ElementCardProps) {
  const definition = definitionFor(result.element);
  const theme = ELEMENT_THEME[result.element] ?? ELEMENT_THEME_DEFAULT;

  if (result.status === "not_addressed") {
    const askKey = `${result.element}-ask`;
    const isCopied = copiedKey === askKey;
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-5">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${theme.dotMuted}`} />
          <h3 className="font-semibold text-slate-500">{result.element}</h3>
        </div>
        <p className="mt-1 pl-4 text-xs text-slate-400">{definition}</p>
        <p className="mt-3 pl-4 text-sm italic text-slate-400">
          Not addressed on this call.
        </p>

        {result.nextQuestion ? (
          <div className="mt-3 rounded-lg bg-blue-50/70 p-3 ring-1 ring-blue-100">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-brand-blue">
                Ask next
              </p>
              <button
                type="button"
                onClick={() => onCopy(result.nextQuestion, askKey)}
                className="text-[11px] font-medium text-brand-blue transition hover:text-brand-navy"
              >
                {isCopied ? "✓ copied" : "copy"}
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-700">{result.nextQuestion}</p>
          </div>
        ) : null}
      </div>
    );
  }

  const cardKey = `${result.element}-card`;
  const cardCopied = copiedKey === cardKey;

  return (
    <div
      className={`rounded-xl border border-t-4 border-slate-200 ${theme.bar} bg-white p-5 shadow-sm transition hover:shadow-md`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
          <h3 className={`font-semibold ${theme.title}`}>{result.element}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCopy(`${result.element}: ${result.value.trim()}`, cardKey)}
            title="Copy this element"
            className="text-xs font-medium text-slate-400 transition hover:text-brand-blue"
          >
            {cardCopied ? "✓ copied" : "copy"}
          </button>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${theme.pill}`}
          >
            Found
          </span>
        </div>
      </div>
      <p className="mt-1 pl-4 text-xs text-slate-400">{definition}</p>

      {/* Editable summary */}
      <label className="mt-4 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
        Summary
      </label>
      <textarea
        value={result.value}
        onChange={(e) => onValueChange(e.target.value)}
        rows={3}
        className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-800 transition focus:border-brand-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
      />

      {/* Named people — copy just the name for a Salesforce contact */}
      {result.people.length > 0 ? (
        <div className="mt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            People
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {result.people.map((person, i) => {
              const key = `${result.element}-person-${i}`;
              const isCopied = copiedKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onCopy(person.name, key)}
                  title={`Copy "${person.name}" to add as a Salesforce contact`}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <span className="font-medium text-slate-800">{person.name}</span>
                  {person.title ? (
                    <span className="text-slate-400">· {person.title}</span>
                  ) : null}
                  <span
                    className={
                      isCopied
                        ? "ml-1 font-medium text-brand-blue"
                        : "ml-1 text-slate-400 group-hover:text-brand-blue"
                    }
                  >
                    {isCopied ? "✓ copied" : "copy name"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {result.evidence ? (
        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Evidence
          </p>
          <p className="mt-1 text-xs italic text-slate-500">“{result.evidence}”</p>
        </div>
      ) : null}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
      <div className="h-3 w-1/3 rounded bg-slate-200" />
      <div className="mt-2 h-2 w-2/3 rounded bg-slate-100" />
      <div className="mt-5 h-16 rounded-lg bg-slate-100" />
    </div>
  );
}

export default function Analyzer() {
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<MeddpiccElementResult[] | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Restore any saved work on first load (browser-only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (typeof saved.transcript === "string") setTranscript(saved.transcript);
      if (typeof saved.notes === "string") setNotes(saved.notes);
      if (Array.isArray(saved.cards)) setCards(saved.cards);
      if (Array.isArray(saved.risks)) setRisks(saved.risks);
      if (saved.emailDraft && typeof saved.emailDraft === "object") {
        setEmailDraft(saved.emailDraft);
      }
    } catch {
      // Ignore unreadable/old saved state.
    }
  }, []);

  // Save whenever the inputs or results change.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ transcript, notes, cards, risks, emailDraft }),
      );
    } catch {
      // Storage may be unavailable (private mode, etc.) — fail quietly.
    }
  }, [transcript, notes, cards, risks, emailDraft]);

  function clearAll() {
    setTranscript("");
    setNotes("");
    setCards(null);
    setRisks([]);
    setEmailDraft(null);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // no-op
    }
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((c) => (c === key ? null : c)), 1500);
    } catch {
      setError("Couldn't access the clipboard. You can still select and copy manually.");
    }
  }

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setEmailDraft(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Something went wrong.");
      }
      setCards(data.elements as MeddpiccElementResult[]);
      setRisks(Array.isArray(data.risks) ? (data.risks as Risk[]) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setCards(null);
      setRisks([]);
    } finally {
      setLoading(false);
    }
  }

  function updateValue(index: number, value: string) {
    setCards((prev) =>
      prev ? prev.map((c, i) => (i === index ? { ...c, value } : c)) : prev,
    );
  }

  function loadExample() {
    setTranscript(EXAMPLE_TRANSCRIPT);
    setNotes(EXAMPLE_NOTES);
    setError(null);
    setCards(null);
    setEmailDraft(null);
  }

  async function handleDraftEmail() {
    if (!cards) return;
    setEmailLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, notes, elements: cards, risks }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "Something went wrong.");
      }
      setEmailDraft({
        subject: String(data.subject ?? ""),
        body: String(data.body ?? ""),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't draft the email.");
    } finally {
      setEmailLoading(false);
    }
  }

  const canAnalyze = transcript.trim().length > 0 && !loading;
  const foundCount = cards?.filter((c) => c.status === "found").length ?? 0;

  return (
    <div className="space-y-8">
      {/* Input panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="transcript"
                className="block text-sm font-medium text-slate-700"
              >
                Call transcript
              </label>
              <button
                type="button"
                onClick={loadExample}
                disabled={loading}
                className="text-xs font-medium text-brand-blue transition hover:text-brand-navy disabled:opacity-40"
              >
                Try an example
              </button>
            </div>
            <textarea
              id="transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={11}
              placeholder="Paste the full sales call transcript here…"
              className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 p-3 text-sm shadow-sm transition focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            {transcript.length > LONG_TRANSCRIPT_CHARS ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-600">
                <svg
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
                Long transcript — analysis may take longer, and very long calls
                can hit the model&apos;s limit. If it fails, try the key sections.
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-slate-700"
            >
              Notes <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any extra context from the rep…"
              className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 p-3 text-sm shadow-sm transition focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-navy focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <>
                  <Spinner />
                  Analyzing…
                </>
              ) : (
                "Analyze"
              )}
            </button>
            {!loading && (transcript || notes || cards) ? (
              <button
                type="button"
                onClick={clearAll}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Clear
              </button>
            ) : null}
            {loading ? (
              <span className="text-sm text-slate-500">
                Reading the call and qualifying it…
              </span>
            ) : null}
          </div>

          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <svg
              className="h-3.5 w-3.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Stays in your browser; sent to Anthropic to analyze.
          </p>
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Loading skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : null}

      {/* Results */}
      {!loading && cards ? (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                MEDDPICC summary
              </h2>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-brand-blue ring-1 ring-blue-100">
                {foundCount} of 8 found
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDraftEmail}
                disabled={emailLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {emailLoading ? (
                  <>
                    <Spinner />
                    Drafting…
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    {emailDraft ? "Redraft email" : "Draft follow-up email"}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => copy(buildSalesforceText(cards, risks), "salesforce")}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-navy focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {copiedKey === "salesforce" ? "✓ Copied" : "Copy for Salesforce"}
              </button>
            </div>
          </div>

          <p className="mt-1 text-xs text-slate-400">
            Edit any summary before copying. Click a person’s name to copy it for a
            Salesforce contact.
          </p>

          {/* Risks & red flags */}
          {risks.length > 0 ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <svg
                  className="h-4 w-4 text-amber-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
                Risks &amp; red flags
              </h3>
              <ul className="mt-3 space-y-2.5">
                {risks.map((r, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        r.severity === "high" ? "bg-red-500" : "bg-amber-500"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {r.title}
                        {r.severity === "high" ? (
                          <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                            High
                          </span>
                        ) : null}
                      </p>
                      {r.detail ? (
                        <p className="mt-0.5 text-xs text-slate-500">{r.detail}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-sm text-emerald-700">
              <svg
                className="h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21.801 10A10 10 0 1 1 17 3.335" />
                <path d="m9 11 3 3L22 4" />
              </svg>
              No major red flags on this call.
            </div>
          )}

          {/* Follow-up email draft */}
          {emailDraft ? (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <svg
                    className="h-4 w-4 text-brand-blue"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  Follow-up email
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    copy(
                      `Subject: ${emailDraft.subject}\n\n${emailDraft.body}`,
                      "email",
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-navy focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {copiedKey === "email" ? "✓ Copied" : "Copy email"}
                </button>
              </div>

              <label className="mt-3 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Subject
              </label>
              <input
                value={emailDraft.subject}
                onChange={(e) =>
                  setEmailDraft((prev) =>
                    prev ? { ...prev, subject: e.target.value } : prev,
                  )
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
              />

              <label className="mt-3 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Body
              </label>
              <textarea
                value={emailDraft.body}
                onChange={(e) =>
                  setEmailDraft((prev) =>
                    prev ? { ...prev, body: e.target.value } : prev,
                  )
                }
                rows={12}
                className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                Drafted from this call — review and edit before sending.
              </p>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {cards.map((el, i) => (
              <ElementCard
                key={el.element}
                result={el}
                onValueChange={(value) => updateValue(i, value)}
                onCopy={copy}
                copiedKey={copiedKey}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
