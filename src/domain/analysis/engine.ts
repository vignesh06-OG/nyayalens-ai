import {
  RISK_DIMENSIONS,
  type AnalysisResult,
  type Clause,
  type HeatmapCell,
  type HeatmapData,
  type RiskAssessment,
  type RiskDimension,
  type RiskLevel,
} from "./types";

import { extractObligations } from "./obligations";

// Re-exported so existing importers keep resolving these from "./engine".
export { segmentClauses, splitSentences } from "./segmentation";
export { extractObligations };

/* ------------------------------------------------------------------ */
/* Keyword signals per risk dimension (shared with sibling engines)    */
/* ------------------------------------------------------------------ */

export const KEYWORD_SIGNALS: Readonly<Record<RiskDimension, readonly string[]>> = {
  ambiguity: [
    "sole discretion",
    "reasonable",
    "material adverse",
    "as agreed",
    "including but not limited to",
    "etc.",
    "to be determined",
    "appropriate",
    "satisfactory",
  ],
  liability: [
    "indemnify",
    "indemnity",
    "hold harmless",
    "liable",
    "liability",
    "consequential damages",
    "unlimited",
    "waive",
    "waiver",
    "defend",
  ],
  termination: [
    "terminat",
    "forfeit",
    "evict",
    "rescind",
    "suspend",
    "lock-out",
    "lock out",
  ],
  payment: [
    "late fee",
    "penalty",
    "interest",
    "non-refundable",
    "forfeit",
    "arrears",
    "escalat",
    "deposit",
    "rent",
  ],
  confidentiality: [
    "confidential",
    "non-disclosure",
    "proprietary",
    "trade secret",
    "survive termination",
  ],
  renewal: [
    "auto-renew",
    "automatic renewal",
    "evergreen",
    "lock-in",
    "renewal term",
    "rollover",
    "roll over",
  ],
};

const ONE_SIDED_SIGNALS: readonly string[] = [
  "sole discretion",
  "at its option",
  "without notice",
  "irrevocable",
  "at any time",
];

const PROTECTIVE_SIGNALS: readonly string[] = [
  "capped at",
  "limited to",
  "mutual",
  "in writing",
  "cure period",
  "reasonable efforts",
  "30 days notice",
  "30 days' notice",
];

/** Named traps produce the most useful driver lines. */
const TRAP_SIGNALS: ReadonlyArray<{ pattern: string; driver: string }> = [
  { pattern: "auto-renew", driver: "Auto-renewal trap" },
  { pattern: "automatic renewal", driver: "Auto-renewal trap" },
  { pattern: "non-refundable", driver: "Non-refundable money at risk" },
  { pattern: "unlimited", driver: "Uncapped exposure" },
  { pattern: "hold harmless", driver: "Broad indemnity / hold-harmless" },
  { pattern: "sole discretion", driver: "One-sided discretion" },
  { pattern: "without notice", driver: "Action possible without notice" },
  { pattern: "forfeit", driver: "Forfeiture risk" },
  { pattern: "consequential damages", driver: "Consequential-damages exposure" },
  { pattern: "irrevocable", driver: "Irrevocable obligation" },
];

const LEVEL_WEIGHTS: Readonly<Record<RiskLevel, number>> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

export function levelForScore(score: number): RiskLevel {
  if (score < 25) {
    return "low";
  }
  if (score < 50) {
    return "medium";
  }
  if (score < 75) {
    return "high";
  }
  return "critical";
}

/** Dominant (highest-scoring) dimension of a score record. */
export function dominantDimension(scores: Record<RiskDimension, number>): RiskDimension {
  let best: RiskDimension = RISK_DIMENSIONS[0];
  let bestScore = scores[RISK_DIMENSIONS[0]];
  for (const dimension of RISK_DIMENSIONS) {
    const score = scores[dimension];
    if (score > bestScore) {
      best = dimension;
      bestScore = score;
    }
  }
  return best;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function countMatches(text: string, signals: readonly string[]): number {
  let matches = 0;
  for (const signal of signals) {
    if (text.includes(signal)) {
      matches += 1;
    }
  }
  return matches;
}

/* ------------------------------------------------------------------ */
/* Engine 01 — pure functions                                          */
/* ------------------------------------------------------------------ */

/** Rule-based dual-lens risk assessment of a single clause. */
export function assessClauseRisk(clause: Clause): RiskAssessment {
  const text = clause.text.toLowerCase();

  const dimensionScores: Record<RiskDimension, number> = {
    ambiguity: clamp(countMatches(text, KEYWORD_SIGNALS.ambiguity) * 26, 0, 100),
    liability: clamp(countMatches(text, KEYWORD_SIGNALS.liability) * 26, 0, 100),
    termination: clamp(countMatches(text, KEYWORD_SIGNALS.termination) * 26, 0, 100),
    payment: clamp(countMatches(text, KEYWORD_SIGNALS.payment) * 26, 0, 100),
    confidentiality: clamp(countMatches(text, KEYWORD_SIGNALS.confidentiality) * 26, 0, 100),
    renewal: clamp(countMatches(text, KEYWORD_SIGNALS.renewal) * 26, 0, 100),
  };

  const drivers: string[] = [];
  for (const trap of TRAP_SIGNALS) {
    if (text.includes(trap.pattern) && !drivers.includes(trap.driver)) {
      drivers.push(trap.driver);
    }
  }

  const maxDimension = clamp(
    Math.max(
      dimensionScores.ambiguity,
      dimensionScores.liability,
      dimensionScores.termination,
      dimensionScores.payment,
      dimensionScores.confidentiality,
      dimensionScores.renewal,
    ),
    0,
    100,
  );
  const oneSided = countMatches(text, ONE_SIDED_SIGNALS) * 5;
  const protective = countMatches(text, PROTECTIVE_SIGNALS) * 5;

  let score = clamp(maxDimension + oneSided - protective, 0, 100);
  // A clause with no detectable risk language is genuinely low risk.
  if (maxDimension === 0 && oneSided === 0) {
    score = 5;
  }

  if (drivers.length === 0) {
    const top = dominantDimension(dimensionScores);
    if (dimensionScores[top] > 0) {
      drivers.push(`${top} language detected`);
    }
  }
  if (oneSided > 0 && !drivers.includes("One-sided drafting")) {
    drivers.push("One-sided drafting");
  }

  return {
    clauseId: clause.id,
    riskLevel: levelForScore(score),
    score,
    drivers: drivers.slice(0, 5),
    dimensionScores,
  };
}

/**
 * Build the clause × dimension heatmap. When AI-enriched assessments are
 * supplied they drive the cells; otherwise clauses are rule-assessed here.
 */
export function generateHeatmapData(
  clauses: readonly Clause[],
  assessments?: readonly RiskAssessment[],
): HeatmapData {
  const byClause = new Map<string, RiskAssessment>(
    (assessments ?? clauses.map(assessClauseRisk)).map((a): [string, RiskAssessment] => [
      a.clauseId,
      a,
    ]),
  );

  const cells: HeatmapCell[] = [];
  for (const clause of clauses) {
    const assessment = byClause.get(clause.id) ?? assessClauseRisk(clause);
    for (const dimension of RISK_DIMENSIONS) {
      const score = assessment.dimensionScores[dimension];
      cells.push({
        clauseId: clause.id,
        dimension,
        score,
        riskLevel: levelForScore(score),
      });
    }
  }

  return {
    clauseIds: clauses.map((c) => c.id),
    dimensions: [...RISK_DIMENSIONS],
    cells,
  };
}

/** Aggregate 0–100 risk score; higher-severity clauses weigh more. */
export function computeRiskScore(assessments: readonly RiskAssessment[]): number {
  if (assessments.length === 0) {
    return 0;
  }
  let weightedSum = 0;
  let totalWeight = 0;
  for (const assessment of assessments) {
    const weight = LEVEL_WEIGHTS[assessment.riskLevel];
    weightedSum += assessment.score * weight;
    totalWeight += weight;
  }
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

/** Convenience: full rule-based analysis in one deterministic pass. */
export function analyzeClauses(clauses: readonly Clause[]): AnalysisResult {
  const assessments = clauses.map(assessClauseRisk);
  return {
    clauses: [...clauses],
    assessments,
    heatmap: generateHeatmapData(clauses, assessments),
    obligations: extractObligations(clauses),
    riskScore: computeRiskScore(assessments),
  };
}
