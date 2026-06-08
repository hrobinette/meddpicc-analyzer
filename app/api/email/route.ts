import { draftFollowUpEmail, EmailError } from "@/lib/email";
import type { AnalysisResult, MeddpiccElementResult, Risk } from "@/lib/meddpicc";

// Run on the Node.js runtime (the Anthropic SDK is not Edge-compatible here).
export const runtime = "nodejs";
// This route calls an external API per request — never cache it.
export const dynamic = "force-dynamic";

// Draft a follow-up email from the rep's transcript (+ optional notes) and the
// MEDDPICC analysis the page already has in hand.
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

  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const transcript = String(obj.transcript ?? "");
  const notes = String(obj.notes ?? "");
  const elements = Array.isArray(obj.elements)
    ? (obj.elements as MeddpiccElementResult[])
    : [];
  const risks = Array.isArray(obj.risks) ? (obj.risks as Risk[]) : [];

  if (!transcript.trim()) {
    return Response.json(
      { error: "Analyze a transcript before drafting an email." },
      { status: 400 },
    );
  }
  if (elements.length === 0) {
    return Response.json(
      { error: "No analysis to draft from. Run the analysis first." },
      { status: 400 },
    );
  }

  const result: AnalysisResult = { elements, risks };

  try {
    const draft = await draftFollowUpEmail(transcript, notes, result);
    return Response.json(draft, { status: 200 });
  } catch (err) {
    console.error("[/api/email] failed:", err);
    if (err instanceof EmailError) {
      return Response.json(
        { error: `Could not draft an email: ${err.message}` },
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
