"use client";

import { useState } from "react";
import {
  MEDDPICC_ELEMENTS,
  type AnalysisResult,
  type MeddpiccElementResult,
} from "@/lib/meddpicc";

// Look up the canonical definition to show under each card title.
function definitionFor(element: string): string {
  return (
    MEDDPICC_ELEMENTS.find((e) => e.key === element)?.definition ?? ""
  );
}

function ElementCard({ result }: { result: MeddpiccElementResult }) {
  const definition = definitionFor(result.element);

  if (result.status === "not_addressed") {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 opacity-70">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-semibold text-slate-500">{result.element}</h3>
        </div>
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

      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">
        {result.value}
      </p>

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
  const [result, setResult] = useState<AnalysisResult | null>(null);

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
      setResult(data as AnalysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const canAnalyze = transcript.trim().length > 0 && !loading;

  return (
    <div className="space-y-8">
      {/* Inputs */}
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
            rows={12}
            placeholder="Paste the full sales call transcript here…"
            className="mt-1 w-full resize-y rounded-md border border-slate-300 p-3 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
      {result ? (
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            MEDDPICC summary
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {result.elements.map((el) => (
              <ElementCard key={el.element} result={el} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
