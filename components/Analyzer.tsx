"use client";

import { useEffect, useState } from "react";
import {
  MEDDPICC_ELEMENTS,
  type MeddpiccElementResult,
} from "@/lib/meddpicc";
import { EXAMPLE_TRANSCRIPT, EXAMPLE_NOTES } from "@/lib/example";

// Persist the rep's work so an accidental refresh doesn't lose it.
const STORAGE_KEY = "meddpicc-analyzer:v1";

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

function buildSalesforceText(cards: MeddpiccElementResult[]): string {
  return cards
    .map((c) =>
      c.status === "found"
        ? `${c.element}: ${c.value.trim()}`
        : `${c.element}: (not addressed on this call)`,
    )
    .join("\n");
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
          <div className="mt-3 rounded-lg bg-indigo-50/70 p-3 ring-1 ring-indigo-100">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-500">
                Ask next
              </p>
              <button
                type="button"
                onClick={() => onCopy(result.nextQuestion, askKey)}
                className="text-[11px] font-medium text-indigo-500 transition hover:text-indigo-700"
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
            className="text-xs font-medium text-slate-400 transition hover:text-indigo-600"
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
        className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-sm text-slate-800 transition focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
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
                  className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  <span className="font-medium text-slate-800">{person.name}</span>
                  {person.title ? (
                    <span className="text-slate-400">· {person.title}</span>
                  ) : null}
                  <span
                    className={
                      isCopied
                        ? "ml-1 font-medium text-indigo-600"
                        : "ml-1 text-slate-400 group-hover:text-indigo-500"
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
    } catch {
      // Ignore unreadable/old saved state.
    }
  }, []);

  // Save whenever the inputs or results change.
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ transcript, notes, cards }),
      );
    } catch {
      // Storage may be unavailable (private mode, etc.) — fail quietly.
    }
  }, [transcript, notes, cards]);

  function clearAll() {
    setTranscript("");
    setNotes("");
    setCards(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setCards(null);
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
                className="text-xs font-medium text-indigo-600 transition hover:text-indigo-800 disabled:opacity-40"
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
              className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 p-3 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
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
              className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 p-3 text-sm shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
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
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-100">
                {foundCount} of 8 found
              </span>
            </div>
            <button
              type="button"
              onClick={() => copy(buildSalesforceText(cards), "salesforce")}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {copiedKey === "salesforce" ? "✓ Copied" : "Copy for Salesforce"}
            </button>
          </div>

          <p className="mt-1 text-xs text-slate-400">
            Edit any summary before copying. Click a person’s name to copy it for a
            Salesforce contact.
          </p>

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
