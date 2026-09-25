import type { AnalysisResult, Clause, RiskLevel } from "../analysis/types";

/**
 * Engine 04 — action kit domain model. Pure types only.
 */

export interface NegotiationPoint {
  id: string;
  clauseId: string;
  title: string;
  /** Why it matters. */
  rationale: string;
  /** What to ask for. */
  ask: string;
  severity: RiskLevel;
  /** 1 (nice-to-have) … 10 (deal-breaker). */
  priority: number;
  /** Whether the ask can be traded away in a package deal. */
  tradeable: boolean;
}

export interface AmendmentDraft {
  id: string;
  clauseId: string;
  issue: string;
  originalText: string;
  proposedText: string;
  rationale: string;
  /** Concession position if the first ask is refused. */
  fallbackPosition: string | null;
}

export interface LawyerQuestion {
  id: string;
  question: string;
  topic: string;
  whyItMatters: string;
}

export interface ActionKit {
  negotiationPoints: NegotiationPoint[];
  amendments: AmendmentDraft[];
  questionsForLawyer: LawyerQuestion[];
  /** Ordered playbook steps. */
  playbook: string[];
}

export interface ComplianceChecklistItem {
  id: string;
  /** What must be true to stay compliant. */
  task: string;
  /** Deadline expression when one exists. */
  due: string | null;
  /** "party-a" | "party-b" | "both" */
  party: string;
  sourceClause: string;
}

/** Type-only re-exports for kit authors. */
export type { AnalysisResult, Clause };
