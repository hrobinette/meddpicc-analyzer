import Analyzer from "@/components/Analyzer";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Instant{" "}
          <span className="bg-gradient-to-r from-brand-blue to-brand-navy bg-clip-text text-transparent">
            MEDDPICC
          </span>{" "}
          summaries
        </h1>
        <p className="mt-2 text-slate-600">
          Paste a call transcript and get Salesforce-ready qualification cards.
        </p>
      </header>

      <Analyzer />
    </main>
  );
}
