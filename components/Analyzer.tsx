"use client";

import { useState } from "react";
import {
  MEDDPICC_ELEMENTS,
  type MeddpiccElementResult,
} from "@/lib/meddpicc";

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

  if (result.status === "not_addressed") {
    const askKey = `${result.element}-ask`;
    const isCopied = copiedKey === askKey;
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-slate-300" />
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

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-transparent transition hover:ring-indigo-100">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <h3 className="font-semibold text-slate-900">{result.element}</h3>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
          Found
        </span>
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

  const canAnalyze = transcript.trim().length > 0 && !loading;
  const foundCount = cards?.filter((c) => c.status === "found").length ?? 0;

  return (
    <div className="space-y-8">
      {/* Input panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-4">
          <div>
            <label
              htmlFor="transcript"
              className="block text-sm font-medium text-slate-700"
            >
              Call transcript
            </label>
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
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
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
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
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
