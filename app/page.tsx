import Analyzer from "@/components/Analyzer";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">MEDDPICC Analyzer</h1>
        <p className="mt-2 text-slate-600">
          Paste a sales call transcript and get a MEDDPICC qualification summary
          as cards — so you know what to update in Salesforce without
          re-listening to the call.
        </p>
      </header>

      <Analyzer />
    </main>
  );
}
