// The 8 MEDDPICC elements, in canonical order, with the exact definitions
// the model must use. Shared by the API route (prompt) and the UI (rendering).

export const MEDDPICC_ELEMENTS = [
  {
    key: "Metrics",
    definition:
      "quantifiable business impact or value the buyer wants to achieve.",
  },
  {
    key: "Economic Buyer",
    definition: "the person with budget authority to approve the purchase.",
  },
  {
    key: "Decision Criteria",
    definition:
      "the formal or informal criteria used to evaluate options.",
  },
  {
    key: "Decision Process",
    definition:
      "the steps, stakeholders, and timeline to reach a decision.",
  },
  {
    key: "Paper Process",
    definition:
      "procurement, legal, security, and contracting steps to close.",
  },
  {
    key: "Identify Pain",
    definition: "the core business pain driving the deal.",
  },
  {
    key: "Champion",
    definition:
      "an internal advocate with influence who sells on our behalf.",
  },
  {
    key: "Competition",
    definition:
      'alternatives being considered, including "do nothing"/status quo.',
  },
] as const;

export type MeddpiccElementKey = (typeof MEDDPICC_ELEMENTS)[number]["key"];

export const MODEL = "claude-sonnet-4-6";

// A specifically named individual mentioned for an element (e.g. the Economic
// Buyer or Champion). `name` is copyable on its own for adding a Salesforce contact.
export interface Person {
  name: string;
  title: string;
}

// The validated shape returned for each of the 8 elements.
export interface MeddpiccElementResult {
  element: string;
  status: "found" | "not_addressed";
  value: string;
  evidence: string;
  people: Person[];
  // A suggested question the rep should ask next time to uncover/strengthen this
  // element. Most useful on elements the call didn't address.
  nextQuestion: string;
}

// A qualification red flag surfaced from the call.
export interface Risk {
  title: string;
  detail: string;
  severity: "high" | "medium";
}

// The top-level contract the API returns and the UI renders.
export interface AnalysisResult {
  elements: MeddpiccElementResult[];
  risks: Risk[];
}
