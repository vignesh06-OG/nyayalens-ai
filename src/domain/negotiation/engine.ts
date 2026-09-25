import { assessClauseRisk } from "../analysis/engine";
import {
  getProvision,
  provisionsForContractKind,
  shortCitation,
} from "../legal/indian-provisions";
import type { Contract } from "../simulation/types";
import { NEGOTIATION_PLAYBOOKS, type NegotiationPlaybook } from "./playbooks";
import type {
  NegotiationGoalKind,
  NegotiationResult,
  NegotiationRound,
  RedlineItem,
  Stance,
} from "./types";
import {
  CONVERGENCE_LADDER,
  CONVERGENCE_LADDER_GENERAL,
  NEGOTIATION_ROUNDS,
  ROUND_INDICES,
} from "./types";

/**
 * Engine 06 — deterministic multi-agent negotiation. Three rounds of
 * Party A (drafter-side) vs Party B (user-side) with a Mediator converging
 * the gap, every position grounded in the canonical Indian-provisions DB.
 * This engine is also the AI-free floor: the provider overlays GenAI text on
 * the same skeleton and degrades back to it verbatim.
 */

const STANCES_A: readonly [Stance, Stance, Stance] = ["aggressive", "firm", "conciliatory"];
const STANCES_B: readonly [Stance, Stance, Stance] = ["firm", "firm", "settled"];

/** Classify a free-text ask into a playbook goal (signal scoring). */
export function detectGoalKind(goal: string): NegotiationGoalKind {
  const text = goal.toLowerCase();
  let best: NegotiationGoalKind = "general";
  let bestScore = 0;
  for (const [kind, playbook] of Object.entries(NEGOTIATION_PLAYBOOKS) as Array<
    [NegotiationGoalKind, NegotiationPlaybook]
  >) {
    const score = playbook.signals.filter((signal) => text.includes(signal)).length;
    if (score > bestScore) {
      best = kind;
      bestScore = score;
    }
  }
  return best;
}

/** Resolve provision ids to unique short citations ("TPA § 106"). */
function citationsFor(ids: readonly string[]): string[] {
  const citations: string[] = [];
  for (const id of ids) {
    const provision = getProvision(id);
    if (provision === null) {
      continue;
    }
    const citation = shortCitation(provision);
    if (!citations.includes(citation)) {
      citations.push(citation);
    }
  }
  return citations;
}

function buildRedlines(
  contract: Contract,
  playbook: NegotiationPlaybook,
): RedlineItem[] {
  const signals = playbook.signals;
  const matched = contract.provisions
    .filter(
      (provision) =>
        playbook.targetTopics.includes(provision.topic) ||
        signals.some((signal) => provision.text.toLowerCase().includes(signal)),
    )
    .map((provision) => ({
      provision,
      risk: assessClauseRisk({
        id: provision.id,
        reference: provision.reference,
        title: provision.topic,
        text: provision.text,
      }).score,
    }))
    .sort((a, b) => b.risk - a.risk)
    .slice(0, 2);

  const citations = citationsFor(playbook.citationsB);
  const items: RedlineItem[] = matched.map((entry, index) => ({
    id: `rl-${index + 1}`,
    clauseReference: entry.provision.reference,
    issue: playbook.redline.issue,
    proposedText: playbook.redline.proposedText,
    rationale: playbook.redline.rationale,
    citations,
  }));

  if (items.length === 0) {
    items.push({
      id: "rl-1",
      clauseReference: "General",
      issue: playbook.redline.issue,
      proposedText: playbook.redline.proposedText,
      rationale: playbook.redline.rationale,
      citations,
    });
  }
  return items;
}

/**
 * Run the full three-round negotiation. Pure and deterministic: identical
 * inputs always produce identical outputs (the fallback contract).
 */
export function runNegotiation(contract: Contract, userGoal: string): NegotiationResult {
  const goal = detectGoalKind(userGoal);
  const playbook = NEGOTIATION_PLAYBOOKS[goal];
  const ladder = goal === "general" ? CONVERGENCE_LADDER_GENERAL : CONVERGENCE_LADDER;

  const citesA = citationsFor(playbook.citationsA);
  const citesB = citationsFor(playbook.citationsB);
  const citesMediator = citationsFor(playbook.citationsMediator);

  const rounds: NegotiationRound[] = [];
  for (const idx of ROUND_INDICES) {
    const round = idx + 1;
    rounds.push({
      round,
      partyA: {
        round,
        agent: "party-a",
        stance: STANCES_A[idx],
        position: playbook.partyA[idx],
        // Literal-index access keeps tuple lookups undefined-free under
        // noUncheckedIndexedAccess.
        concessions: idx === 1 ? [playbook.concessionsA[0]] : idx === 2 ? [playbook.concessionsA[1]] : [],
        citations: idx === 0 ? [] : citesA,
      },
      partyB: {
        round,
        agent: "party-b",
        stance: STANCES_B[idx],
        position: playbook.partyB[idx],
        concessions: idx === 1 ? [playbook.concessionsB[0]] : idx === 2 ? [playbook.concessionsB[1]] : [],
        citations: citesB,
      },
      mediator: {
        round,
        gapSummary: playbook.gaps[idx],
        convergence: ladder[idx],
        suggestion: playbook.suggestions[idx],
        citations: citesMediator,
      },
    });
  }

  const finalRedlines = buildRedlines(contract, playbook);
  const kindCitations = provisionsForContractKind(contract.kind).map(shortCitation);
  const statutoryBasis: string[] = [];
  for (const citation of [...citesA, ...citesB, ...citesMediator, ...kindCitations]) {
    if (!statutoryBasis.includes(citation)) {
      statutoryBasis.push(citation);
    }
  }

  const agreementScore = ladder[2];
  const closingBridge = playbook.suggestions[2];
  const finalSummary =
    `After ${NEGOTIATION_ROUNDS} rounds on the "${goal}" ask, the parties converge at ` +
    `${agreementScore}/100. ${closingBridge} Statutory basis: ${statutoryBasis.slice(0, 4).join(", ")}. ` +
    `Not legal advice — verify the final redline with a qualified professional.`;

  return {
    goal,
    goalStatement: userGoal,
    rounds,
    finalRedlines,
    agreementScore,
    finalSummary,
    statutoryBasis,
  };
}

/** Export the negotiation as a plain-text redline document (.txt download). */
export function formatRedlineDocument(result: NegotiationResult, contractTitle: string): string {
  const lines: string[] = [
    "NyayaLens AI — Negotiation Redline",
    `Contract: ${contractTitle}`,
    `Goal: ${result.goalStatement}`,
    `Detected ask: ${result.goal} · Agreement score: ${result.agreementScore}/100`,
    "",
    "== NEGOTIATION ROUNDS ==",
  ];
  for (const round of result.rounds) {
    lines.push(
      `Round ${round.round} (convergence ${round.mediator.convergence}/100)`,
      `  Party A [${round.partyA.stance}]: ${round.partyA.position}`,
      ...round.partyA.concessions.map((c) => `    conceded: ${c}`),
      ...round.partyA.citations.map((c) => `    cites: ${c}`),
      `  Party B [${round.partyB.stance}]: ${round.partyB.position}`,
      ...round.partyB.concessions.map((c) => `    conceded: ${c}`),
      ...round.partyB.citations.map((c) => `    cites: ${c}`),
      `  Mediator: ${round.mediator.gapSummary}`,
      `    bridge: ${round.mediator.suggestion}`,
      "",
    );
  }
  lines.push("== FINAL REDLINES ==");
  for (const item of result.finalRedlines) {
    lines.push(
      `• [${item.clauseReference}] ${item.issue}`,
      `  Proposed: ${item.proposedText}`,
      `  Rationale: ${item.rationale}`,
      `  Citations: ${item.citations.join(", ")}`,
      "",
    );
  }
  lines.push(
    "== SUMMARY ==",
    result.finalSummary,
    "",
    "NyayaLens AI provides informational assistance, not legal advice.",
    "Verify important decisions with a qualified legal professional.",
  );
  return lines.join("\n");
}
