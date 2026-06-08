import { anthropic } from "@/lib/anthropic";
import { MODEL, type AnalysisResult, type EmailDraft } from "@/lib/meddpicc";

// Thrown when the model's reply can't be parsed into a usable email draft.
// The route turns this into a clean HTTP error for the client.
export class EmailError extends Error {}

function buildSystemPrompt(): string {
  return `You are a B2B sales rep writing a short follow-up email after a sales call. You are given the call transcript (and optional notes) plus a MEDDPICC summary of what was covered.

Write a professional, warm, concise follow-up email the rep can send to the prospect.

Rules:
- Ground EVERYTHING strictly in the transcript, notes, and summary. Never invent facts, names, numbers, commitments, or next steps that were not actually discussed.
- Open by thanking them for their time and briefly recapping 2-4 key points that were genuinely discussed.
- Reinforce value using the buyer's own metrics or pain points if they came up — otherwise keep it general.
- Confirm any next steps or follow-ups that were actually agreed on. If a meeting/timeline was discussed, reference it; if none was, propose a light, optional next step (e.g. a quick follow-up call) without inventing specifics.
- Keep it scannable: a greeting, 2-3 short paragraphs (or a few short bullet lines for next steps), and a sign-off.
- Address the primary external contact by first name if one is clearly named in the call; otherwise use a neutral greeting like "Hi there".
- End with the sign-off line and "[Your name]" as a placeholder — do not invent the rep's name or company.
- Tone: friendly, confident, not pushy. No fabricated urgency.
- Return a single top-level JSON object: { "subject": "<concise subject line>", "body": "<plain-text email body with line breaks>" }
- The body must be plain text (no markdown, no HTML). Use real line breaks between paragraphs.
- Respond with JSON only. No markdown, no code fences, no preamble, no commentary.`;
}

// Compact, human-readable view of the analysis so the model can focus the email
// on what was actually covered (and flag what's still open) without re-deriving it.
function summarizeAnalysis(result: AnalysisResult): string {
  const found = result.elements.filter((e) => e.status === "found");
  const lines: string[] = [];

  if (found.length > 0) {
    lines.push("Covered on the call:");
    for (const e of found) {
      const who =
        e.people.length > 0
          ? ` (people: ${e.people
              .map((p) => (p.title ? `${p.name} — ${p.title}` : p.name))
              .join(", ")})`
          : "";
      lines.push(`- ${e.element}: ${e.value}${who}`);
    }
  } else {
    lines.push("No MEDDPICC elements were explicitly covered.");
  }

  return lines.join("\n");
}

// Strip accidental ```json fences / stray prose so JSON.parse has a clean shot.
function extractJson(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    text = text.slice(first, last + 1);
  }
  return text;
}

/**
 * Draft a follow-up email from the transcript (+ optional notes) and the
 * MEDDPICC analysis. Network + parsing failures surface as thrown errors.
 */
export async function draftFollowUpEmail(
  transcript: string,
  notes: string | undefined,
  result: AnalysisResult,
): Promise<EmailDraft> {
  const userContent = [
    `Sales call transcript:\n\n${transcript.trim()}`,
    notes && notes.trim() ? `\n\nAdditional rep notes:\n\n${notes.trim()}` : "",
    `\n\nMEDDPICC summary:\n\n${summarizeAnalysis(result)}`,
  ].join("");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: buildSystemPrompt(),
    messages: [{ role: "user", content: userContent }],
  });

  const rawText = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(rawText));
  } catch {
    throw new EmailError("The model did not return valid JSON.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new EmailError("Response was not a JSON object.");
  }
  const obj = parsed as Record<string, unknown>;
  const subject = String(obj.subject ?? "").trim();
  const body = String(obj.body ?? "").trim();
  if (!body) {
    throw new EmailError("Response did not contain an email body.");
  }

  return { subject: subject || "Following up on our call", body };
}
