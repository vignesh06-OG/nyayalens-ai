/**
 * Engine 01 — adversarial analysis domain model. Pure types only.
 */

/** Ordered risk ladder (also used by sibling engines). */
export const RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

/** Risk lenses modelled by the heatmap. */
export const RISK_DIMENSIONS = [
  "ambiguity",
  "liability",
  "termination",
  "payment",
  "confidentiality",
  "renewal",
] as const;
export type RiskDimension = (typeof RISK_DIMENSIONS)[number];

export interface Clause {
  id: string;
  /** Human-readable anchor, e.g. "Clause 3.2(b)". */
  reference: string;
  title: string;
  text: string;
}

export interface RiskAssessment {
  clauseId: string;
  riskLevel: RiskLevel;
  /** 0–100, higher is riskier. */
  score: number;
  /** Short, evidence-grounded reasons behind the score. */
  drivers: string[];
  dimensionScores: Record<RiskDimension, number>;
}

export interface HeatmapCell {
  clauseId: string;
  dimension: RiskDimension;
  score: number;
  riskLevel: RiskLevel;
}

export interface HeatmapData {
  clauseIds: string[];
  dimensions: RiskDimension[];
  cells: HeatmapCell[];
}

export type ObligationParty = "party-a" | "party-b" | "both";

export interface Obligation {
  id: string;
  clauseId: string;
  party: ObligationParty;
  /** What must be done. */
  action: string;
  /** Trigger condition ("upon termination", "if rent is late"), if any. */
  trigger: string | null;
  /** Deadline expression ("within 7 days"), if any. */
  deadline: string | null;
}

export interface AnalysisResult {
  clauses: Clause[];
  assessments: RiskAssessment[];
  heatmap: HeatmapData;
  obligations: Obligation[];
  /** 0–100 aggregate across all assessments. */
  riskScore: number;
}
