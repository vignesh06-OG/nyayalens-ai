import type { AnalysisResult } from "@/domain/analysis/types";
import { generateActionKit } from "@/domain/actions/engine";
import { assessRiskDelta, computeSemanticDiff } from "@/domain/comparison/engine";
import type { Document } from "@/domain/comparison/types";
import type { NegotiationResult } from "@/domain/negotiation/types";
import {
  computeRiskProbability,
  evaluateScenario,
  mapConsequences,
  mapLawReferences,
} from "@/domain/simulation/engine";
import type { Contract } from "@/domain/simulation/types";

import { FALLBACK_MESSAGE } from "./fallback";
import { ANALYSIS_MARKERS, NEGOTIATION_MARKERS, SIM_CARD_MARKERS } from "./prompts";

/**
 * Deterministic narrative composers — the streaming fallback floor. Each
 * composer emits the SAME marker format its AI prompt demands, so the UI
 * splitter contract holds identically on both paths (tested in pipeline).
 */

function clauseTitle(result: AnalysisResult, clauseId: string): string {
  const clause = result.clauses.find((c) => c.id === clauseId);
  return clause !== undefined ? `${clause.reference} (“${clause.title}”)` : clauseId;
}

/** Dual-perspective adversarial narrative from rule-based analysis. */
export function composeAnalysisNarrative(result: AnalysisResult): string {
  const risky = [...result.assessments]
    .filter((a) => a.riskLevel !== "low")
    .sort((a, b) => b.score - a.score);

  const aLines = risky
    .slice(0, 4)
    .map(
      (a) =>
        `- ${clauseTitle(result, a.clauseId)}: ${a.drivers.join("; ") || "exposure detected"}. Push back before signing — this is where you lose leverage.`,
    );
  const bLines = risky
    .slice(0, 4)
    .map(
      (a) =>
        `- ${clauseTitle(result, a.clauseId)}: the counterparty will lean on ${a.drivers[0] ?? "the wording"} to press their advantage mid-term.`,
    );

  return [
    FALLBACK_MESSAGE,
    "",
    ANALYSIS_MARKERS.partyA,
    risky.length > 0
      ? ["You are the first-moving party, and the document is written against you in these places:", ...aLines].join("\n")
      : "No material one-sided exposure was detected by the rule engine — verify with counsel before relying on this.",
    "",
    ANALYSIS_MARKERS.partyB,
    risky.length > 0
      ? ["Your counterparty holds real levers under this text:", ...bLines, "Expect them to argue strict construction of every deadline and notice window."].join("\n")
      : "The counterparty has little textual leverage over you in this version.",
  ].join("\n");
}

/** Four-card simulation narrative with statutory anchors. */
export function composeSimulationCards(contract: Contract, scenario: string): string {
  const result = evaluateScenario(contract, scenario);
  const consequences = mapConsequences(result).map((c) => ({
    ...c,
    probability: computeRiskProbability(c),
  }));
  const laws = mapLawReferences(result);
  const worst = consequences.reduce<{ value: number }>(
    (acc, c) => (c.probability.value > acc.value ? { value: c.probability.value } : acc),
    { value: 0 },
  );
  const score = Math.round(worst.value * 100);
  const band = score >= 70 ? "high exposure" : score >= 40 ? "moderate exposure" : "low exposure";

  return [
    FALLBACK_MESSAGE,
    "",
    SIM_CARD_MARKERS.consequences,
    consequences
      .slice(0, 3)
      .map((c) => `- ${c.description} (${c.timeHorizon ?? "timing unclear"}; ${c.probability.band})`)
      .join("\n"),
    "",
    SIM_CARD_MARKERS.law,
    laws
      .slice(0, 4)
      .map((l) => `- ${l.act} ${l.section} — ${l.title}`)
      .join("\n"),
    "",
    SIM_CARD_MARKERS.action,
    (consequences[0]?.mitigations ?? ["Document every notice and payment in writing."])
      .slice(0, 3)
      .map((m) => `- ${m}`)
      .join("\n"),
    "",
    `${SIM_CARD_MARKERS.score} ${score}/100 — ${band} under this scenario.`,
  ].join("\n");
}

/** Materiality narrative for the comparator. */
export function composeCompareNarrative(base: Document, target: Document): string {
  const diff = computeSemanticDiff(base, target);
  const delta = assessRiskDelta(diff);
  const direction =
    delta.delta < -5
      ? `the target version is SAFER (risk score moved ${delta.baseScore} → ${delta.targetScore})`
      : delta.delta > 5
        ? `the target version is RISKIER (risk score moved ${delta.baseScore} → ${delta.targetScore})`
        : `the risk profile is roughly unchanged (${delta.baseScore} → ${delta.targetScore})`;

  return [
    FALLBACK_MESSAGE,
    "",
    `Clause-level diff: ${diff.addedCount} added, ${diff.removedCount} removed, ${diff.modifiedCount} modified.`,
    `Overall: ${direction}.`,
    "",
    "Material changes:",
    ...delta.movements.slice(0, 5).map((m) => `- [${m.slot}] ${m.note}`),
  ].join("\n");
}

/** Deterministic negotiation cover email draft. */
export function composeEmailDraft(analysis: AnalysisResult): string {
  const kit = generateActionKit(analysis);
  const top = kit.negotiationPoints[0];
  const second = kit.negotiationPoints[1];

  return [
    FALLBACK_MESSAGE,
    "",
    "Subject: Counter-proposal — key terms for agreement",
    "",
    "Dear Sir/Madam,",
    "",
    "Thank you for sharing the draft. We have reviewed it in detail and would like to propose the following adjustments before we proceed:",
    ...(top !== undefined ? [`1. ${top.title}: ${top.ask}`] : []),
    ...(second !== undefined ? [`2. ${second.title}: ${second.ask}`] : []),
    "",
    "We have attached a redline reflecting these points and remain open to discussing a middle ground that works for both sides. Please share your comments within seven days so we can keep the timeline on track.",
    "",
    "Warm regards,",
    "[Your name]",
  ].join("\n");
}

/**
 * Three-round negotiation narrative (Engine 06). Emits the same markers the
 * AI narrative prompt demands so the Negotiation section splits identically.
 */
export function composeNegotiationNarrative(result: NegotiationResult, contractTitle: string): string {
  const roundBlocks = result.rounds.map((round) =>
    [
      `Round ${round.round} — convergence ${round.mediator.convergence}/100`,
      `  Party A (${round.partyA.stance}): ${round.partyA.position}`,
      `  Party B (${round.partyB.stance}): ${round.partyB.position} [cites: ${round.partyB.citations.join(", ")}]`,
      `  Mediator: ${round.mediator.gapSummary} Bridge: ${round.mediator.suggestion}`,
    ].join("\n"),
  );
  const redlines = result.finalRedlines.map(
    (item) =>
      `- [${item.clauseReference}] ${item.issue}: ${item.proposedText} (cites: ${item.citations.join(", ")})`,
  );

  return [
    FALLBACK_MESSAGE,
    "",
    `Negotiation over “${contractTitle}” — goal: ${result.goalStatement}`,
    "",
    NEGOTIATION_MARKERS.rounds,
    ...roundBlocks,
    "",
    NEGOTIATION_MARKERS.redline,
    ...redlines,
    "",
    NEGOTIATION_MARKERS.verdict,
    result.finalSummary,
  ].join("\n");
}
