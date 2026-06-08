import Analyzer from "@/components/Analyzer";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Turn a sales call into a{" "}
          <span className="bg-gradient-to-r from-brand-blue to-brand-navy bg-clip-text text-transparent">
            MEDDPICC
          </span>{" "}
          summary
        </h1>
        <p className="mt-2 text-slate-600">
          Paste a transcript and get a clean qualification breakdown as cards — so
          you know exactly what to update in Salesforce, without re-listening to
          the call.
        </p>
      </header>

      <Analyzer />
    </main>
  );
}
