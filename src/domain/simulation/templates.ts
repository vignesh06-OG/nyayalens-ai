import type { RiskLevel } from "../analysis/types";
import type { ScenarioKind } from "./types";

/**
 * Engine 02 data tables — scenario classification signals and consequence
 * templates. Pure data, split from the engine's control flow so new scenario
 * vocabulary extends tables without touching logic (open/closed).
 */

export const SCENARIO_KIND_SIGNALS: Readonly<Record<ScenarioKind, readonly string[]>> = {
  breach: ["breach", "breaches", "violat", "fails to", "fails", "default", "misses", "non-performance"],
  termination: ["terminat", "end the", "exit", "walk away", "quit", "evict"],
  payment: ["pay", "payment", "rent", "fee", "invoice", "salary", "cost", "charge", "money"],
  dispute: ["dispute", "sue", "court", "arbitrat", "litigat", "claim", "damages"],
  renewal: ["renew", "extension", "extend", "rollover", "auto-renew"],
  general: [],
};

export interface ConsequenceTemplate {
  description: string;
  severity: RiskLevel;
  timeHorizon: string | null;
  mitigations: string[];
  /** Constrain to provisions with these topics (empty = always). */
  topics: readonly string[];
}

export const CONSEQUENCE_TEMPLATES: Readonly<Record<ScenarioKind, readonly ConsequenceTemplate[]>> = {
  breach: [
    {
      description: "Late fees, interest, or penalties accrue on the overdue amount.",
      severity: "high",
      timeHorizon: "immediate",
      mitigations: ["Pay within the cure period", "Negotiate a cap on late fees"],
      topics: ["payment"],
    },
    {
      description: "Termination rights may be triggered against the breaching side.",
      severity: "critical",
      timeHorizon: "14 days",
      mitigations: ["Cure the breach in writing before the cure window closes"],
      topics: ["termination"],
    },
    {
      description: "Indemnity and damages claims can be initiated against the breaching side.",
      severity: "critical",
      timeHorizon: "30 days",
      mitigations: ["Document good-faith efforts to perform", "Cap liability at the next renewal"],
      topics: ["liability"],
    },
    {
      description: "Reputation and credit standing may be affected for future agreements.",
      severity: "medium",
      timeHorizon: "90 days",
      mitigations: ["Negotiate a neutral reference clause"],
      topics: [],
    },
  ],
  termination: [
    {
      description: "Surviving clauses (confidentiality, indemnity) continue after termination.",
      severity: "medium",
      timeHorizon: "immediate",
      mitigations: ["Negotiate a sunset on surviving obligations"],
      topics: ["confidentiality", "liability"],
    },
    {
      description: "Deposits or prepayments may be forfeited on termination.",
      severity: "high",
      timeHorizon: "immediate",
      mitigations: ["Require pro-rata refund of prepayments", "Add an accounting-on-termination duty"],
      topics: ["payment"],
    },
    {
      description: "Notice-period obligations may require continued performance after the exit decision.",
      severity: "medium",
      timeHorizon: "30 days",
      mitigations: ["Shorten the notice period", "Add termination for convenience with notice"],
      topics: ["termination"],
    },
    {
      description: "Transition assistance may be owed to the other side.",
      severity: "low",
      timeHorizon: "60 days",
      mitigations: ["Cap transition assistance at 30 days"],
      topics: [],
    },
  ],
  payment: [
    {
      description: "Late-payment penalties and interest begin to accrue.",
      severity: "high",
      timeHorizon: "immediate",
      mitigations: ["Invoke any grace period immediately", "Request a written payment plan"],
      topics: ["payment"],
    },
    {
      description: "Non-payment can escalate to suspension of services or possession.",
      severity: "critical",
      timeHorizon: "14 days",
      mitigations: ["Document partial payments and disputes in writing"],
      topics: ["payment", "termination"],
    },
    {
      description: "Security deposit or guarantee may be applied against arrears.",
      severity: "high",
      timeHorizon: "30 days",
      mitigations: ["Demand an itemised statement before set-off"],
      topics: ["payment"],
    },
    {
      description: "Credit standing with the counterparty may be affected for renewals.",
      severity: "low",
      timeHorizon: "90 days",
      mitigations: ["Keep written proof of every payment"],
      topics: [],
    },
  ],
  dispute: [
    {
      description: "Arbitration or court proceedings may be initiated by either side.",
      severity: "critical",
      timeHorizon: "30 days",
      mitigations: ["Use the contractual notice-and-cure window first", "Preserve all correspondence"],
      topics: ["liability", "termination"],
    },
    {
      description: "Legal costs and management time divert from actual work under the contract.",
      severity: "medium",
      timeHorizon: "immediate",
      mitigations: ["Propose mediation before arbitration"],
      topics: [],
    },
    {
      description: "Damages exposure crystallises, including any consequential-damages waiver.",
      severity: "high",
      timeHorizon: "90 days",
      mitigations: ["Quantify losses early", "Rely on liability caps where present"],
      topics: ["liability"],
    },
  ],
  renewal: [
    {
      description: "Auto-renewal may lock the agreement for another full term.",
      severity: "high",
      timeHorizon: "30 days",
      mitigations: ["Diarise the non-renewal notice window", "Serve non-renewal notice in writing"],
      topics: ["renewal"],
    },
    {
      description: "Rent or fee escalation clauses may raise the price at renewal.",
      severity: "medium",
      timeHorizon: "30 days",
      mitigations: ["Cap escalation to CPI or 5%", "Renegotiate before the notice window closes"],
      topics: ["payment", "renewal"],
    },
    {
      description: "Renewal extends surviving obligations for another cycle.",
      severity: "low",
      timeHorizon: "90 days",
      mitigations: ["Refresh the terms rather than auto-renewing"],
      topics: [],
    },
  ],
  general: [
    {
      description: "Ambiguous wording may be interpreted against the drafting side.",
      severity: "medium",
      timeHorizon: "90 days",
      mitigations: ["Clarify key terms in a side letter"],
      topics: ["ambiguity"],
    },
    {
      description: "Operational friction between the parties is the most likely near-term effect.",
      severity: "low",
      timeHorizon: "30 days",
      mitigations: ["Open a written channel with the counterparty"],
      topics: [],
    },
    {
      description: "Long-term relationship value may erode without early course-correction.",
      severity: "low",
      timeHorizon: "180 days",
      mitigations: ["Schedule a review meeting before tensions harden"],
      topics: [],
    },
  ],
};
