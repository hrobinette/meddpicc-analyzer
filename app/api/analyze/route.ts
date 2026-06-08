import { anthropic } from "@/lib/anthropic";
import { MODEL } from "@/lib/meddpicc";

// Run on the Node.js runtime (the Anthropic SDK is not Edge-compatible here).
export const runtime = "nodejs";
// This route calls an external API per request — never cache it.
export const dynamic = "force-dynamic";

// STEP 2: prove the Anthropic call works end-to-end with a hardcoded transcript
// and a plain-text response. Later steps switch this to POST + structured JSON.
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
    return new Response(
      "ANTHROPIC_API_KEY is not set on the server. Add it to .env.local and restart.",
      { status: 500 },
    );
  }

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        "You are a B2B sales assistant. Summarize the MEDDPICC qualification signals you can find in the transcript. Be concise.",
      messages: [
        {
          role: "user",
          content: `Here is a sales call transcript:\n\n${HARDCODED_TRANSCRIPT}`,
        },
      ],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    return new Response(text, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("[/api/analyze] Anthropic call failed:", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return new Response(`Anthropic request failed: ${detail}`, { status: 502 });
  }
}
