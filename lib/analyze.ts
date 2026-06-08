import { anthropic } from "@/lib/anthropic";
import {
  MEDDPICC_ELEMENTS,
  MODEL,
  type AnalysisResult,
  type MeddpiccElementResult,
  type Person,
} from "@/lib/meddpicc";

// Thrown when the model's reply can't be parsed/validated into the contract.
// The route turns this into a clean HTTP error for the client.
export class AnalysisError extends Error {}

function buildSystemPrompt(): string {
  const elementList = MEDDPICC_ELEMENTS.map(
    (e, i) => `${i + 1}. ${e.key}: ${e.definition}`,
  ).join("\n");

  return `You are a B2B sales qualification assistant. You read a sales call transcript (and optional rep notes) and extract MEDDPICC qualification signals.

The 8 MEDDPICC elements, with the exact definitions you must use:
${elementList}

Rules:
- Extract ONLY what is explicitly supported by the transcript or notes.
- NEVER infer, guess, or fill in a field that isn't addressed. Most calls only touch a few of the 8 elements — that is expected and completely fine.
- Mark an element "found" only when the transcript or notes explicitly address it. Otherwise mark it "not_addressed" with an empty value and empty evidence.
- For each of the 8 elements, return an object with this exact shape:
  {
    "element": "<the exact element name from the list above>",
    "status": "found" | "not_addressed",
    "value": "<concise summary of what was found, or empty string>",
    "evidence": "<short supporting quote or paraphrase from the input, or empty string>",
    "people": [ { "name": "<person's name>", "title": "<their role/title, or empty string>" } ],
    "nextQuestion": "<one concise question the rep should ask next time to uncover or strengthen this element>"
  }
- In "people", list any specifically named individuals relevant to that element — most often the Economic Buyer and the Champion, but also any named stakeholders. Only include a person when an actual name is given in the transcript or notes. If no specific person is named for an element, use an empty array [].
- Always include a "nextQuestion" for every element: a single, natural question the rep can ask on the next call to surface or deepen this element. Tailor it to specifics from this conversation when possible (reference named people, metrics, or timelines that came up). Keep it to one sentence.
- Return a single top-level JSON object: { "elements": [ ...exactly 8 objects, one per element, in the order listed above ] }
- Respond with JSON only. No markdown, no code fences, no preamble, no commentary.`;
}

// Strip accidental ```json fences / stray prose so JSON.parse has a clean shot.
function extractJson(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  // Fall back to the outermost { ... } if the model added surrounding text.
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    text = text.slice(first, last + 1);
  }
  return text;
}

// Pull named individuals out of an element, keeping only entries with a real name.
function normalizePeople(raw: unknown): Person[] {
  if (!Array.isArray(raw)) return [];
  const people: Person[] = [];
  for (const item of raw) {
    if (item && typeof item === "object" && "name" in item) {
      const name = String((item as Record<string, unknown>).name ?? "").trim();
      if (!name) continue;
      const title = String((item as Record<string, unknown>).title ?? "").trim();
      people.push({ name, title });
    }
  }
  return people;
}

// Turn whatever the model returned into exactly 8 well-formed elements in
// canonical MEDDPICC order. Missing or malformed entries become "not_addressed"
// so the UI contract holds no matter what.
function normalize(parsed: unknown): AnalysisResult {
  if (typeof parsed !== "object" || parsed === null || !("elements" in parsed)) {
    throw new AnalysisError("Response did not contain an 'elements' object.");
  }
  const rawElements = (parsed as { elements: unknown }).elements;
  if (!Array.isArray(rawElements)) {
    throw new AnalysisError("'elements' was not an array.");
  }

  // Index whatever the model gave us by lowercased element name.
  const byName = new Map<string, Record<string, unknown>>();
  for (const item of rawElements) {
    if (item && typeof item === "object" && "element" in item) {
      const name = String((item as Record<string, unknown>).element).trim().toLowerCase();
      byName.set(name, item as Record<string, unknown>);
    }
  }

  const elements: MeddpiccElementResult[] = MEDDPICC_ELEMENTS.map((canonical) => {
    const match = byName.get(canonical.key.toLowerCase());
    const status =
      match && match.status === "found" ? "found" : ("not_addressed" as const);
    const value =
      status === "found" && typeof match?.value === "string" ? match.value.trim() : "";
    const evidence =
      status === "found" && typeof match?.evidence === "string"
        ? match.evidence.trim()
        : "";
    const people = normalizePeople(match?.people);
    const nextQuestion =
      typeof match?.nextQuestion === "string" ? match.nextQuestion.trim() : "";
    return { element: canonical.key, status, value, evidence, people, nextQuestion };
  });

  return { elements };
}

/**
 * Analyze a transcript (+ optional notes) into a validated MEDDPICC result.
 * All network + parsing failures surface as thrown errors for the route to map.
 */
export async function analyzeTranscript(
  transcript: string,
  notes?: string,
): Promise<AnalysisResult> {
  const userContent = [
    `Sales call transcript:\n\n${transcript.trim()}`,
    notes && notes.trim()
      ? `\n\nAdditional rep notes:\n\n${notes.trim()}`
      : "",
  ].join("");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
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
    throw new AnalysisError("The model did not return valid JSON.");
  }

  return normalize(parsed);
}
