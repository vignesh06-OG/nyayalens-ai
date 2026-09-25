import {
  getProvision,
  provisionsForContractKind,
  shortCitation,
} from "@/domain/legal/indian-provisions";
import { detectGoalKind, runNegotiation } from "@/domain/negotiation/engine";
import { NEGOTIATION_PLAYBOOKS } from "@/domain/negotiation/playbooks";
import type { NegotiationGoalKind } from "@/domain/negotiation/types";
import type { Contract, ContractKind } from "@/domain/simulation/types";

/**
 * Central prompt library. Every GenAI call builds its prompt here —
 * prompt text never lives inside route handlers or the provider.
 */

export interface PromptBundle {
  system: string;
  prompt: string;
}

/* ------------------------------------------------------------------ */
/* Shared streaming markers (fallback composers emit the same ones)    */
/* ------------------------------------------------------------------ */

export const ANALYSIS_MARKERS = {
  partyA: "PARTY A PERSPECTIVE:",
  partyB: "PARTY B PERSPECTIVE:",
} as const;

export const SIM_CARD_MARKERS = {
  consequences: "⚠️ Consequences:",
  law: "📜 Relevant Law:",
  action: "🎯 Recommended Action:",
  score: "📊 Risk Score:",
} as const;

export const NEGOTIATION_MARKERS = {
  rounds: "🔄 NEGOTIATION ROUNDS:",
  redline: "📝 FINAL REDLINE:",
  verdict: "⚖️ MEDIATOR VERDICT:",
} as const;

/* ------------------------------------------------------------------ */
/* Structured (generateObject) prompts                                 */
/* ------------------------------------------------------------------ */

const ANALYZE_SYSTEM = `You are NyayaLens, an adversarial legal-intelligence engine.
Return one entry per clause, in document order. Each entry must carry:
reference, title, summary (max 40 words), riskLevel ("low" | "medium" | "high" | "critical"),
score (0-100, higher is riskier), drivers (short phrases citing concrete language),
and obligations (party "party-a" | "party-b" | "both", action, trigger, deadline — use null when absent).
Red-team from both sides of the table: surface leverage, ambush terms, and one-sided drafting.
Never invent clauses that are not in the document.`;

export function buildAnalyzePrompt(documentText: string, documentType: ContractKind): PromptBundle {
  return {
    system: ANALYZE_SYSTEM,
    prompt: `Document type: ${documentType}\n\nDocument text:\n"""\n${documentText}\n"""`,
  };
}

const SIMPLIFY_SYSTEM = `You are NyayaLens, a plain-language legal refractor.
Rewrite the text for the requested reading level without pulling its teeth: every obligation,
right, deadline, trigger, and remedy must survive the rewrite. Prefer short sentences and
common words. Do not add legal advice. Return only the rewritten text in "simplified".`;

export function buildSimplifyPrompt(text: string, targetLevel: number): PromptBundle {
  return {
    system: SIMPLIFY_SYSTEM,
    prompt: `Target reading level: US grade ${targetLevel}\n\nText:\n"""\n${text}\n"""`,
  };
}

const COMPARE_SYSTEM = `You are NyayaLens, a clause-level contract comparator.
Describe what materially moved between the two versions in plain language, then list each
material change (added, removed, or shifted risk) as one item in "materiality".
In "summary" state, in one or two sentences, where the risk moved and who it favours.`;

export function buildComparePrompt(textA: string, textB: string): PromptBundle {
  return {
    system: COMPARE_SYSTEM,
    prompt: `Version A (base):\n"""\n${textA}\n"""\n\nVersion B (target):\n"""\n${textB}\n"""`,
  };
}

const SIMULATE_SYSTEM = `You are NyayaLens, a legal scenario simulator.
Narrate what happens when the given scenario occurs under this contract. Walk through the
triggering provisions, the consequence chain with rough timing, and concrete mitigations.
Plain language. State assumptions explicitly. No headers, no markdown tables — flowing prose.`;

export function buildSimulationStreamPrompt(contract: Contract, scenario: string): PromptBundle {
  return {
    system: SIMULATE_SYSTEM + statutoryAnchorBlock(contract.kind),
    prompt: `Contract type: ${contract.kind}\nContract: ${contract.title}\n\nContract text:\n"""\n${contract.text.slice(0, 20000)}\n"""\n\nScenario: ${scenario}`,
  };
}

/* ------------------------------------------------------------------ */
/* Streaming narrative prompts (streamText, plain-text output)         */
/* ------------------------------------------------------------------ */

const ANALYSIS_NARRATIVE_SYSTEM = `You are NyayaLens, an adversarial legal-intelligence engine producing a dual-perspective narrative.
Write EXACTLY two labelled sections in this order and format (plain text, no markdown):

PARTY A PERSPECTIVE:
<3-6 sentences in second person ("you") on how the FIRST-MOVING party (tenant/employee/recipient/licensee) can be squeezed — worst clauses, leverage lost, ambush terms.>

PARTY B PERSPECTIVE:
<3-6 sentences on the levers the COUNTERPARTY (landlord/employer/discloser/licensor) holds and the arguments they would make.>

Ground every claim in the document. Cite clause numbers when visible. Do not add a third section.`;

export function buildAnalysisNarrativePrompt(
  documentText: string,
  documentType: ContractKind,
): PromptBundle {
  return {
    system: ANALYSIS_NARRATIVE_SYSTEM,
    prompt: `Document type: ${documentType}\n\nDocument text:\n"""\n${documentText}\n"""`,
  };
}

const SIM_CARDS_SYSTEM = `You are NyayaLens, a legal scenario simulator. Respond in EXACTLY these four labelled sections (plain text, no markdown):

⚠️ Consequences:
- <bullet: what happens first, with rough timing>
- <bullet: what cascades next>
- <bullet: worst realistic outcome>

📜 Relevant Law:
- <Act section — one line of plain English, e.g. "ICA § 73 — compensation for loss caused by breach">
Cite real Indian contract/statute anchors where they apply (Indian Contract Act 1872 "ICA", Bharatiya Nyaya Sanhita 2023 "BNS", Transfer of Property Act "TPA", Specific Relief Act "SRA"). 2-4 bullets.

🎯 Recommended Action:
- <concrete steps the user should take, in order> 2-4 bullets.

📊 Risk Score: <integer 0-100>/100 — <one short clause: band and why>`;

/**
 * Statutory anchor block sourced from the canonical Indian-provisions DB
 * (src/domain/legal). Injected into law-citing prompts so the model quotes
 * real, verified sections instead of inventing them.
 */
function statutoryAnchorBlock(kind: string): string {
  const anchors = provisionsForContractKind(kind)
    .map((provision) => `- ${shortCitation(provision)} (${provision.statute}) — ${provision.title}: ${provision.summary}`)
    .join("\n");
  return `\n\nStatutory anchors from the verified Indian-law database (cite ONLY where genuinely applicable, using the exact section numbers):\n${anchors}`;
}

export function buildSimulationCardsPrompt(contract: Contract, scenario: string): PromptBundle {
  return {
    system: SIM_CARDS_SYSTEM + statutoryAnchorBlock(contract.kind),
    prompt: `Contract type: ${contract.kind}\nContract: ${contract.title}\n\nContract text:\n"""\n${contract.text.slice(0, 16000)}\n"""\n\nScenario: ${scenario}`,
  };
}

const SIMPLIFY_STREAM_SYSTEM = `You are NyayaLens, a plain-language legal refractor.
Return ONLY the rewritten text — no preamble, no notes, no quotes. Preserve every obligation,
right, deadline, trigger, and remedy. Short sentences, common words.`;

export function buildSimplifyStreamPrompt(
  text: string,
  targetLevel: number,
  language: "en" | "hi",
): PromptBundle {
  const languageLine =
    language === "hi"
      ? "Rewrite in natural Hindi (Devanagari script), keeping any defined English capitalised terms as-is."
      : "Rewrite in English.";
  return {
    system: `${SIMPLIFY_STREAM_SYSTEM}\n${languageLine}`,
    prompt: `Target reading level: US grade ${targetLevel}\n\nText:\n"""\n${text}\n"""`,
  };
}

const EMAIL_SYSTEM = `You are NyayaLens, drafting a negotiation cover email for a legal counterparty.
Write a complete, ready-to-edit email in plain text: subject line, salutation, 2-4 short body
paragraphs that lead with the strongest ask and stay firm but professional, and a sign-off.
No markdown. Do not invent facts that are not in the context.`;

export function buildEmailPrompt(kitContext: string): PromptBundle {
  return {
    system: EMAIL_SYSTEM,
    prompt: `Negotiation context (points and amendments):\n"""\n${kitContext.slice(0, 12000)}\n"""`,
  };
}

/* ------------------------------------------------------------------ */
/* Negotiation prompts (Engine 06 — adversarial three-agent role-play) */
/* ------------------------------------------------------------------ */

/** Goal-specific statutory anchors resolved from the canonical legal DB. */
function negotiationAnchorBlock(kind: string, goal: NegotiationGoalKind): string {
  const playbook = NEGOTIATION_PLAYBOOKS[goal];
  const ids = [...playbook.citationsB, ...playbook.citationsMediator, ...playbook.citationsA];
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const id of [...ids, ...provisionsForContractKind(kind).map((p) => p.id)]) {
    const provision = getProvision(id);
    if (provision === null || seen.has(provision.id)) {
      continue;
    }
    seen.add(provision.id);
    lines.push(`- ${shortCitation(provision)} (${provision.statute}) — ${provision.title}: ${provision.summary}`);
  }
  return `\n\nStatutory anchors from the verified Indian-law database — the ONLY statutes you may cite, using these exact section numbers (never invent sections):\n${lines.join("\n")}`;
}

const NEGOTIATION_SYSTEM = `You are NyayaLens orchestrating a three-round adversarial negotiation over a contract. You voice three agents:
- PARTY A — the drafter/counterparty advocate (landlord, employer, discloser, service provider). Opens aggressive, protects the drafted terms, concedes slowly and only for value.
- PARTY B — the user's advocate. Pushes the user's stated goal and grounds every legal claim in the statutory anchors below.
- MEDIATOR — a neutral retired-judge voice. Each round: state the remaining gap plainly, then propose one concrete bridge.

Return exactly three rounds. Reason IRAC-style internally (Issue, Rule, Application, Conclusion) but output only the positions. Each position: 1-3 sentences, plain text, no markdown, grounded in the contract text or the anchors. Movement is mandatory: round 1 opens far apart, round 2 trades concessions, round 3 closes on concrete final terms. Finish with finalSummary: 2-3 sentences stating the settled terms and any residual gap.`;

export function buildNegotiationPrompt(contract: Contract, userGoal: string): PromptBundle {
  const goal = detectGoalKind(userGoal);
  return {
    system: NEGOTIATION_SYSTEM + negotiationAnchorBlock(contract.kind, goal),
    prompt: `Detected ask: ${goal}\nUser goal: ${userGoal}\nContract type: ${contract.kind}\nContract: ${contract.title}\n\nContract text:\n"""\n${contract.text.slice(0, 16000)}\n"""`,
  };
}

const NEGOTIATION_NARRATIVE_SYSTEM = `You are NyayaLens narrating a completed three-round negotiation simulation. Write EXACTLY these labelled sections in this order and format (plain text, no markdown):

🔄 NEGOTIATION ROUNDS:
Round 1 — convergence NN/100
  Party A (stance): position in 1-2 sentences
  Party B (stance): position in 1-2 sentences [cites: short citations]
  Mediator: gap summary, then the bridge
Round 2 — convergence NN/100
  (same three lines)
Round 3 — convergence NN/100
  (same three lines)

📝 FINAL REDLINE:
- [clause reference] issue: proposed replacement text (cites: short citations)

⚖️ MEDIATOR VERDICT:
2-3 sentences: settled terms, residual gap, agreement score NN/100, and a reminder that this is informational assistance, not legal advice.

Keep the convergence numbers, citations, and redline content EXACTLY as given in the negotiation skeleton — you may only improve fluency, never change substance.`;

/**
 * Streaming narrative prompt. The deterministic skeleton (Engine 06) is
 * embedded so the narrated rounds, citations, and scores match the structured
 * /api/negotiate response exactly — the AI fluently re-voices rule output.
 */
export function buildNegotiationNarrativePrompt(contract: Contract, userGoal: string): PromptBundle {
  const skeleton = runNegotiation(contract, userGoal);
  const rounds = skeleton.rounds
    .map((round) => [
      `Round ${round.round} — convergence ${round.mediator.convergence}/100`,
      `  Party A (${round.partyA.stance}): ${round.partyA.position}`,
      `  Party B (${round.partyB.stance}): ${round.partyB.position} [cites: ${round.partyB.citations.join(", ")}]`,
      `  Mediator: ${round.mediator.gapSummary} Bridge: ${round.mediator.suggestion}`,
    ].join("\n"))
    .join("\n");
  const redlines = skeleton.finalRedlines
    .map((item) => `- [${item.clauseReference}] ${item.issue}: ${item.proposedText} (cites: ${item.citations.join(", ")})`)
    .join("\n");
  return {
    system: NEGOTIATION_NARRATIVE_SYSTEM + negotiationAnchorBlock(contract.kind, skeleton.goal),
    prompt: `Negotiation skeleton (narrate faithfully):\n${rounds}\n\nFinal redlines:\n${redlines}\n\nAgreement score: ${skeleton.agreementScore}/100\nVerdict seed: ${skeleton.finalSummary}`,
  };
}
