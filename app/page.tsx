export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">MEDDPICC Analyzer</h1>
      <p className="mt-3 text-slate-600">
        Paste a sales call transcript and get a MEDDPICC qualification summary as
        editable cards, ready to copy into Salesforce.
      </p>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
        <p className="font-medium text-slate-900">Scaffold is running. ✅</p>
        <p className="mt-2">
          Step 2 check: the API route is live at{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800">
            GET /api/analyze
          </code>
          . It sends a hardcoded transcript to Claude and returns plain text.
        </p>
        <p className="mt-2">
          The UI (textarea inputs + 8 cards + Copy for Salesforce) is wired up in
          the later build steps.
        </p>
      </div>
    </main>
  );
}
