import {
  assessClauseRisk,
  computeRiskScore,
  extractObligations,
  generateHeatmapData,
  levelForScore,
  segmentClauses,
} from "@/domain/analysis/engine";
import type { AnalysisResult, Clause, RiskDimension, RiskLevel } from "@/domain/analysis/types";
import { buildComplianceChecklist } from "@/domain/actions/engine";
import { simplifyText } from "@/domain/simplification/engine";
import type { SimplifiedText } from "@/domain/simplification/types";
import type { ContractKind } from "@/domain/simulation/types";

/**
 * Rule-based fallback layer. When GenAI is unavailable every engine degrades
 * to these deterministic templates with the message below — never to a crash.
 * Narrative composers (the streaming floor) live in ./narratives.
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

export { buildComplianceChecklist };
