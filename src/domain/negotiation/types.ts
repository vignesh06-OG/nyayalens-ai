/**
 * Engine 06 — multi-agent negotiation domain model. Pure types only.
 * Three rounds of Party A (drafter-side advocate) vs Party B (user-side
 * advocate) with a Mediator converging the gap, grounded in the canonical
 * Indian-provisions database.
 */

export const NEGOTIATION_GOALS = [
  "deposit",
  "notice",
  "termination",
  "penalty",
  "payment",
  "escalation",
  "renewal",
  "confidentiality",
  "ip",
  "general",
] as const;
export type NegotiationGoalKind = (typeof NEGOTIATION_GOALS)[number];

/** How hard an agent is pushing in a given round. */
export const STANCES = ["aggressive", "firm", "conciliatory", "settled"] as const;
export type Stance = (typeof STANCES)[number];

export interface AgentTurn {
  round: number;
  agent: "party-a" | "party-b";
  stance: Stance;
  /** The position this agent argues in this round. */
  position: string;
  /** What this agent gave up in this round (empty in round 1). */
  concessions: string[];
  /** Short statutory citations backing the position, e.g. "TPA § 106". */
  citations: string[];
}

export interface MediatorTurn {
  round: number;
  /** Plain-language statement of the remaining gap. */
  gapSummary: string;
  /** 0–100: how close the parties are to agreement after this round. */
  convergence: number;
  /** The mediator's proposed bridge. */
  suggestion: string;
  citations: string[];
}

export interface NegotiationRound {
  round: number;
  partyA: AgentTurn;
  partyB: AgentTurn;
  mediator: MediatorTurn;
}

export interface RedlineItem {
  id: string;
  /** Clause the redline targets ("General" when no clause matched). */
  clauseReference: string;
  issue: string;
  proposedText: string;
  rationale: string;
  citations: string[];
}

export interface NegotiationResult {
  goal: NegotiationGoalKind;
  /** The user's goal, verbatim (bounded by the API schema). */
  goalStatement: string;
  rounds: NegotiationRound[];
  finalRedlines: RedlineItem[];
  /** 0–100 likelihood the final terms would be accepted by both sides. */
  agreementScore: number;
  finalSummary: string;
  /** Every statute cited across the negotiation (short citations, unique). */
  statutoryBasis: string[];
}

/** Zero-based round indices — fixed three-round protocol. */
export const ROUND_INDICES = [0, 1, 2] as const;

/** Number of negotiation rounds the engine runs. */
export const NEGOTIATION_ROUNDS = ROUND_INDICES.length;

/** Convergence trajectory per round (deterministic; general goals trail). */
export const CONVERGENCE_LADDER: readonly [number, number, number] = [30, 60, 85];
export const CONVERGENCE_LADDER_GENERAL: readonly [number, number, number] = [20, 45, 70];

// ---------------------------------------------------------------------------
// Playbook contract (data: playbooks-contract.ts / playbooks-dispute.ts)
// ---------------------------------------------------------------------------

export interface NegotiationPlaybook {
  /** Free-text signals used to detect this goal from the user's ask. */
  signals: readonly string[];
  /** Provision ids each agent grounds on. */
  citationsA: readonly string[];
  citationsB: readonly string[];
  citationsMediator: readonly string[];
  /** Round 1–3 positions. */
  partyA: readonly [string, string, string];
  partyB: readonly [string, string, string];
  /** Round 2–3 concessions. */
  concessionsA: readonly [string, string];
  concessionsB: readonly [string, string];
  /** Round 1–3 mediator gap statements and bridges. */
  gaps: readonly [string, string, string];
  suggestions: readonly [string, string, string];
  /** Clause topics (risk dimensions) the redline hunt targets. */
  targetTopics: readonly string[];
  redline: { issue: string; proposedText: string; rationale: string };
}
