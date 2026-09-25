import {
  assessClauseRisk,
  computeRiskScore,
  extractObligations,
  generateHeatmapData,
  levelForScore,
  segmentClauses,
} from "@/domain/analysis/engine";
import type { AnalysisResult, Clause, RiskDimension, RiskLevel } from "@/domain/analysis/types";
import { buildComplianceChecklist, generateActionKit } from "@/domain/actions/engine";
import { computeSemanticDiff, assessRiskDelta } from "@/domain/comparison/engine";
import type { Document } from "@/domain/comparison/types";
import { simplifyText } from "@/domain/simplification/engine";
import type { SimplifiedText } from "@/domain/simplification/types";
import {
  evaluateScenario,
  mapConsequences,
  mapLawReferences,
  computeRiskProbability,
} from "@/domain/simulation/engine";
import type { Contract, ContractKind } from "@/domain/simulation/types";

/**
 * Rule-based fallback layer. When GenAI is unavailable every engine degrades
 * to these deterministic templates with the message below — never to a crash.
 */

export const FALLBACK_MESSAGE =
  "AI analysis temporarily unavailable. Showing rule-based assessment.";

/** Static simplification dictionary (owned by Engine 03, surfaced here). */
export { SIMPLIFICATION_DICTIONARY } from "@/domain/simplification/engine";

/* ------------------------------------------------------------------ */
/* Pre-built risk templates for common document types                  */
/* ------------------------------------------------------------------ */

export interface RiskTemplate {
  pattern: string;
  riskLevel: RiskLevel;
  dimension: RiskDimension;
  driver: string;
}

type TemplateKey = "rental" | "employment" | "nda" | "generic";

export const RISK_TEMPLATES: Readonly<Record<TemplateKey, readonly RiskTemplate[]>> = {
  rental: [
    { pattern: "security deposit", riskLevel: "high", dimension: "payment", driver: "Security deposit at risk" },
    { pattern: "non-refundable", riskLevel: "high", dimension: "payment", driver: "Non-refundable money" },
    { pattern: "evict", riskLevel: "critical", dimension: "termination", driver: "Eviction exposure" },
    { pattern: "auto-renew", riskLevel: "high", dimension: "renewal", driver: "Rental auto-renewal trap" },
    { pattern: "rent escalat", riskLevel: "medium", dimension: "payment", driver: "Rent escalation clause" },
    { pattern: "lock out", riskLevel: "critical", dimension: "termination", driver: "Lock-out risk" },
  ],
  employment: [
    { pattern: "non-compete", riskLevel: "high", dimension: "termination", driver: "Non-compete restriction" },
    { pattern: "without cause", riskLevel: "high", dimension: "termination", driver: "Termination without cause" },
    { pattern: "intellectual property", riskLevel: "medium", dimension: "confidentiality", driver: "Broad IP assignment" },
    { pattern: "notice period", riskLevel: "medium", dimension: "termination", driver: "Notice-period lock-in" },
    { pattern: "probation", riskLevel: "low", dimension: "termination", driver: "Probationary window" },
  ],
  nda: [
    { pattern: "perpetual", riskLevel: "high", dimension: "confidentiality", driver: "Perpetual confidentiality" },
    { pattern: "injunctive relief", riskLevel: "medium", dimension: "liability", driver: "Injunctive-relief exposure" },
    { pattern: "survive", riskLevel: "medium", dimension: "confidentiality", driver: "Obligations survive termination" },
    { pattern: "return or destroy", riskLevel: "low", dimension: "confidentiality", driver: "Return-or-destroy duty" },
    { pattern: "residuals", riskLevel: "medium", dimension: "confidentiality", driver: "Residuals carve-out" },
  ],
  generic: [
    { pattern: "auto-renew", riskLevel: "high", dimension: "renewal", driver: "Auto-renewal trap" },
    { pattern: "unlimited", riskLevel: "critical", dimension: "liability", driver: "Uncapped exposure" },
    { pattern: "sole discretion", riskLevel: "high", dimension: "ambiguity", driver: "One-sided discretion" },
    { pattern: "without notice", riskLevel: "high", dimension: "termination", driver: "Action possible without notice" },
    { pattern: "waive", riskLevel: "medium", dimension: "liability", driver: "Rights waiver" },
  ],
};

function templateKeyFor(kind: ContractKind): TemplateKey {
  if (kind === "rental" || kind === "employment" || kind === "nda") {
    return kind;
  }
  return "generic";
}

/* ------------------------------------------------------------------ */
/* Rule-based engines (deterministic, pure)                            */
/* ------------------------------------------------------------------ */

/** Full rule-based analysis pass — the floor under the AI layer. */
export function fallbackAnalyze(
  documentText: string,
  kind: ContractKind,
): { clauses: Clause[]; result: AnalysisResult } {
  const clauses = segmentClauses(documentText);
  const templates = [...RISK_TEMPLATES[templateKeyFor(kind)], ...RISK_TEMPLATES.generic];

  const assessments = clauses.map((clause) => {
    const base = assessClauseRisk(clause);
    const text = clause.text.toLowerCase();
    const hits = templates.filter((t) => text.includes(t.pattern));

    if (hits.length === 0) {
      return base;
    }

    const drivers = [...base.drivers];
    for (const hit of hits) {
      if (!drivers.includes(hit.driver)) {
        drivers.push(hit.driver);
      }
    }

    const dimensionScores = { ...base.dimensionScores };
    for (const hit of hits) {
      dimensionScores[hit.dimension] = Math.min(100, dimensionScores[hit.dimension] + 20);
    }

    const score = Math.min(100, base.score + hits.length * 8);
    return {
      clauseId: clause.id,
      riskLevel: levelForScore(score),
      score,
      drivers: drivers.slice(0, 5),
      dimensionScores,
    };
  });

  return {
    clauses,
    result: {
      clauses,
      assessments,
      heatmap: generateHeatmapData(clauses, assessments),
      obligations: extractObligations(clauses),
      riskScore: computeRiskScore(assessments),
    },
  };
}

/** Dictionary-driven simplification (Engine 03) as the AI-free floor. */
export function fallbackSimplify(text: string, targetLevel: number): SimplifiedText {
  return simplifyText(text, targetLevel);
}

/* ------------------------------------------------------------------ */
/* Narrative composers — the streaming fallback floor                  */
/* (same marker format the AI prompts demand, so the UI is identical)  */
/* ------------------------------------------------------------------ */

import { ANALYSIS_MARKERS, SIM_CARD_MARKERS } from "./prompts";

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

export { buildComplianceChecklist };
