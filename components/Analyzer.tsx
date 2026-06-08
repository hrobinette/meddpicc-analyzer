"use client";

import { useState } from "react";
import {
  MEDDPICC_ELEMENTS,
  type MeddpiccElementResult,
} from "@/lib/meddpicc";

function definitionFor(element: string): string {
  return MEDDPICC_ELEMENTS.find((e) => e.key === element)?.definition ?? "";
}

// Build the plain-text block for Salesforce from the (possibly edited) cards.
function buildSalesforceText(cards: MeddpiccElementResult[]): string {
  return cards
    .map((c) =>
      c.status === "found"
        ? `${c.element}: ${c.value.trim()}`
        : `${c.element}: (not addressed on this call)`,
    )
    .join("\n");
}

interface ElementCardProps {
  result: MeddpiccElementResult;
  onValueChange: (value: string) => void;
  onCopy: (text: string, key: string) => void;
  copiedKey: string | null;
}

// Defined at module scope (stable identity) so the editable textarea keeps
// focus across re-renders.
function ElementCard({
  result,
  onValueChange,
  onCopy,
  copiedKey,
}: ElementCardProps) {
  const definition = definitionFor(result.element);

  if (result.status === "not_addressed") {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 opacity-70">
        <h3 className="font-semibold text-slate-500">{result.element}</h3>
        <p className="mt-1 text-xs text-slate-400">{definition}</p>
        <p className="mt-3 text-sm italic text-slate-400">
          Not addressed on this call.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{result.element}</h3>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
          Found
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-400">{definition}</p>

      {/* Editable value */}
      <textarea
        value={result.value}
        onChange={(e) => onValueChange(e.target.value)}
        rows={3}
        className="mt-3 w-full resize-y rounded-md border border-slate-200 bg-slate-50 p-2 text-sm text-slate-800 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
      />

      {/* Named people — copy just the name for a Salesforce contact */}
      {result.people.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {result.people.map((person, i) => {
            const key = `${result.element}-person-${i}`;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onCopy(person.name, key)}
                title={`Copy "${person.name}" to add as a Salesforce contact`}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                <span className="font-medium">{person.name}</span>
                {person.title ? (
                  <span className="text-slate-400">· {person.title}</span>
                ) : null}
                <span className="ml-1 text-slate-400">
                  {copiedKey === key ? "✓ copied" : "copy name"}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {result.evidence ? (
        <p className="mt-3 border-l-2 border-slate-200 pl-3 text-xs italic text-slate-500">
          {result.evidence}
        </p>
      ) : null}
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
      prev
        ? prev.map((c, i) => (i === index ? { ...c, value } : c))
        : prev,
    );
  }

  const canAnalyze = transcript.trim().length > 0 && !loading;

  return (
    <div className="space-y-8">
      {/* Inputs */}
      <div className="space-y-4">
        <div>
          <label htmlFor="transcript" className="block text-sm font-medium text-slate-700">
            Call transcript
          </label>
          <textarea
            id="transcript"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={12}
            placeholder="Paste the full sales call transcript here…"
            className="mt-1 w-full resize-y rounded-md border border-slate-300 p-3 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700">
            Notes <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Any extra context from the rep…"
            className="mt-1 w-full resize-y rounded-md border border-slate-300 p-3 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {/* Error */}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Results */}
      {cards ? (
        <div>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">MEDDPICC summary</h2>
            <button
              type="button"
              onClick={() => copy(buildSalesforceText(cards), "salesforce")}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
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
