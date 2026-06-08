import { analyzeTranscript, AnalysisError } from "@/lib/analyze";

// Run on the Node.js runtime (the Anthropic SDK is not Edge-compatible here).
export const runtime = "nodejs";
// This route calls an external API per request — never cache it.
export const dynamic = "force-dynamic";

// STEP 4: accept the rep's real transcript (+ optional notes) via POST and
// return the validated 8-element MEDDPICC result. The page calls this.
export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const transcript =
    body && typeof body === "object" && "transcript" in body
      ? String((body as Record<string, unknown>).transcript ?? "")
      : "";
  const notes =
    body && typeof body === "object" && "notes" in body
      ? String((body as Record<string, unknown>).notes ?? "")
      : "";

  if (!transcript.trim()) {
    return Response.json(
      { error: "Please paste a transcript before analyzing." },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeTranscript(transcript, notes);
    return Response.json(result, { status: 200 });
  } catch (err) {
    console.error("[/api/analyze] failed:", err);
    if (err instanceof AnalysisError) {
      return Response.json(
        { error: `Could not parse a valid analysis: ${err.message}` },
        { status: 502 },
      );
    }
    const detail = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: `Anthropic request failed: ${detail}` },
      { status: 502 },
    );
  }
}
