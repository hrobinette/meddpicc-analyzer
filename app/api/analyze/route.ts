import { analyzeTranscript, AnalysisError } from "@/lib/analyze";

// Run on the Node.js runtime (the Anthropic SDK is not Edge-compatible here).
export const runtime = "nodejs";
// This route calls an external API per request — never cache it.
export const dynamic = "force-dynamic";

// STEP 3: return validated, structured JSON (the 8 MEDDPICC elements) instead
// of plain text. Still uses a hardcoded transcript so it's viewable in a browser;
// step 4 switches to POST with the rep's real transcript + notes.
const HARDCODED_TRANSCRIPT = `
Rep: Thanks for making time. Last call you mentioned onboarding new reps is taking too long.
Buyer: Right — it's about six weeks to ramp someone today, and we're hiring 20 reps next quarter.
Rep: If we could cut that to three weeks, what would that be worth?
Buyer: Honestly that's roughly $400k in faster quota attainment. I'd need our VP of Sales, Dana, to sign off on budget though.
Rep: Understood. Are you also looking at any other tools for this?
Buyer: We're comparing you against building something in-house, but that's stalled.
`.trim();

export async function GET() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  try {
    const result = await analyzeTranscript(HARDCODED_TRANSCRIPT);
    return Response.json(result, { status: 200 });
  } catch (err) {
    console.error("[/api/analyze] failed:", err);
    if (err instanceof AnalysisError) {
      // The model replied but we couldn't validate it into the contract.
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
