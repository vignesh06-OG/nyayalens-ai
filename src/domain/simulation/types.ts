import type { Clause, RiskLevel } from "../analysis/types";

/**
 * Engine 02 — scenario simulation domain model. Pure types only.
 */

export const CONTRACT_KINDS = ["rental", "employment", "nda", "tos", "other"] as const;
export type ContractKind = (typeof CONTRACT_KINDS)[number];

export interface LegalProvision {
  id: string;
  reference: string;
  text: string;
  /** Dominant topic, e.g. "termination", "payment". */
  topic: string;
}

export interface Contract {
  id: string;
  title: string;
  kind: ContractKind;
  text: string;
  provisions: LegalProvision[];
}

export const SCENARIO_KINDS = [
  "breach",
  "termination",
  "payment",
  "dispute",
  "renewal",
  "general",
] as const;
export type ScenarioKind = (typeof SCENARIO_KINDS)[number];

export interface Scenario {
  id: string;
  description: string;
  kind: ScenarioKind;
}

export const PROBABILITY_BANDS = [
  "rare",
  "unlikely",
  "possible",
  "likely",
  "near-certain",
] as const;
export type ProbabilityBand = (typeof PROBABILITY_BANDS)[number];

export interface RiskProbability {
  band: ProbabilityBand;
  /** 0..1 */
  value: number;
}

export interface Consequence {
  id: string;
  /** Provision driving this consequence; null when generic. */
  provisionId: string | null;
  description: string;
  severity: RiskLevel;
  /** e.g. "immediate", "30 days", null */
  timeHorizon: string | null;
  /** Downstream effects surfaced by mapConsequences. */
  cascade: string[];
  /** Concrete ways to reduce exposure (empty when none). */
  mitigations: string[];
}

export interface ScenarioResult {
  scenario: Scenario;
  provisions: LegalProvision[];
  consequences: Consequence[];
  summary: string;
}

/** Statutory anchor cited alongside a scenario (e.g. ICA 1872, BNS 2023). */
export interface LawReference {
  /** Short act code: "ICA", "BNS", "TPA", "SRA", "CONTRACT". */
  act: string;
  /** Section marker, e.g. "§ 73". */
  section: string;
  title: string;
}

/** Type-only re-export so callers can build mock contracts in tests. */
export type { Clause };
