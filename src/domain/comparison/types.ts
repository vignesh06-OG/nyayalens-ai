import type { RiskLevel } from "../analysis/types";
import type { ContractKind } from "../simulation/types";

/**
 * Engine 05 — comparison domain model. Pure types only.
 */

export interface Document {
  id: string;
  title: string;
  kind: ContractKind;
  text: string;
}

export type ChangeKind = "added" | "removed" | "modified" | "unchanged";

export interface ClauseDiff {
  /** Stable slot key, e.g. "c3". */
  slot: string;
  changeKind: ChangeKind;
  baseText: string | null;
  targetText: string | null;
  /** 0..1 lexical-semantic similarity for paired clauses. */
  similarity: number;
  summary: string;
}

export interface DiffResult {
  baseDocumentId: string;
  targetDocumentId: string;
  diffs: ClauseDiff[];
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  /** Rule-composed one-liner (the AI layer may supersede it). */
  summary: string;
}

export interface RiskMovement {
  slot: string;
  before: RiskLevel;
  after: RiskLevel;
  note: string;
}

export interface RiskDelta {
  /** target − base (negative = target is safer). */
  delta: number;
  baseScore: number;
  targetScore: number;
  movements: RiskMovement[];
}
