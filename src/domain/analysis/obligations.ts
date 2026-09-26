// ---------------------------------------------------------------------------
// NyayaLens AI — deterministic obligation extraction
// Party detection + obligation sentences from contract text.
// Pure functions. No secrets, no network.
// ---------------------------------------------------------------------------

import type { Clause, Obligation, ObligationParty } from "./types";

import { splitSentences } from "./segmentation";

const PARTY_A_SIGNALS: readonly string[] = [
  "tenant",
  "employee",
  "recipient",
  "licensee",
  "borrower",
  "supplier",
  "buyer",
  "client",
  "consultant",
  "party a",
];
const PARTY_B_SIGNALS: readonly string[] = [
  "landlord",
  "employer",
  "discloser",
  "licensor",
  "lender",
  "seller",
  "service provider",
  "owner",
  "party b",
];

function detectParty(sentence: string): ObligationParty {
  const text = sentence.toLowerCase();
  if (/both parties|each party|either party|parties mutually/.test(text)) {
    return "both";
  }
  const hasA = PARTY_A_SIGNALS.some((s) => text.includes(s));
  const hasB = PARTY_B_SIGNALS.some((s) => text.includes(s));
  if (hasA && !hasB) {
    return "party-a";
  }
  if (hasB && !hasA) {
    return "party-b";
  }
  return "both";
}

const OBLIGATION_TRIGGER =
  /\b(shall|must|will|agrees? to|undertakes? to|is responsible for|is liable for|required to)\b/i;
const DEADLINE_RE =
  /\b(within\s+\d+\s+\w+|\d+\s+days?\s+(?:prior|before|after)|on or before\s+[^,.;]+|no later than\s+[^,.;]+)/i;
const TRIGGER_RE = /\b(upon|in the event|if|when|after|before)\b[^,.;]*/i;

/** Extract concrete obligations ("who must do what, when") from clauses. */
export function extractObligations(clauses: readonly Clause[]): Obligation[] {
  const obligations: Obligation[] = [];
  let index = 0;

  for (const clause of clauses) {
    for (const sentence of splitSentences(clause.text)) {
      if (!OBLIGATION_TRIGGER.test(sentence)) {
        continue;
      }
      index += 1;
      const deadline = DEADLINE_RE.exec(sentence)?.[0]?.trim() ?? null;
      const trigger = TRIGGER_RE.exec(sentence)?.[0]?.trim() ?? null;
      obligations.push({
        id: `o${index}`,
        clauseId: clause.id,
        party: detectParty(sentence),
        action: sentence.slice(0, 240),
        trigger,
        deadline,
      });
    }
  }

  return obligations;
}
