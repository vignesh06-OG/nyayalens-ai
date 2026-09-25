import { assessClauseRisk, dominantDimension } from "../analysis/engine";
import type { Clause, RiskLevel } from "../analysis/types";
import type {
  Consequence,
  Contract,
  LawReference,
  LegalProvision,
  RiskProbability,
  Scenario,
  ScenarioKind,
  ScenarioResult,
} from "./types";

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

const SCENARIO_KIND_SIGNALS: Readonly<Record<ScenarioKind, readonly string[]>> = {
  breach: ["breach", "breaches", "violat", "fails to", "fails", "default", "misses", "non-performance"],
  termination: ["terminat", "end the", "exit", "walk away", "quit", "evict"],
  payment: ["pay", "payment", "rent", "fee", "invoice", "salary", "cost", "charge", "money"],
  dispute: ["dispute", "sue", "court", "arbitrat", "litigat", "claim", "damages"],
  renewal: ["renew", "extension", "extend", "rollover", "auto-renew"],
  general: [],
};

function detectScenarioKind(scenario: string): ScenarioKind {
  const text = scenario.toLowerCase();
  let best: ScenarioKind = "general";
  let bestScore = 0;
  for (const kind of Object.keys(SCENARIO_KIND_SIGNALS) as ScenarioKind[]) {
    const score = SCENARIO_KIND_SIGNALS[kind].filter((s) => text.includes(s)).length;
    if (score > bestScore) {
      best = kind;
      bestScore = score;
    }
  }
  return best;
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []).filter(
    (w) => !["the", "and", "for", "that", "this", "with", "shall", "party", "parties"].includes(w),
  );
}

/** Rank provisions against the scenario wording (bag-of-words cosine). */
function matchProvisions(provisions: readonly LegalProvision[], scenario: string): LegalProvision[] {
  const scenarioTerms = new Set(tokenize(scenario));
  if (scenarioTerms.size === 0) {
    return [];
  }

  const scored = provisions.map((provision) => {
    const terms = tokenize(provision.text);
    const unique = new Set(terms);
    let overlap = 0;
    for (const term of scenarioTerms) {
      if (unique.has(term)) {
        overlap += 1;
      }
    }
    const score = overlap / Math.sqrt(Math.max(1, unique.size));
    return { provision, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.provision);
}

interface ConsequenceTemplate {
  description: string;
  severity: RiskLevel;
  timeHorizon: string | null;
  mitigations: string[];
  /** Constrain to provisions with these topics (empty = always). */
  topics: readonly string[];
}

const CONSEQUENCE_TEMPLATES: Readonly<Record<ScenarioKind, readonly ConsequenceTemplate[]>> = {
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

/** Map a clause onto a legal provision (topic = dominant risk dimension). */
export function provisionsFromClauses(clauses: readonly Clause[]): LegalProvision[] {
  return clauses.map((clause) => {
    const assessment = assessClauseRisk(clause);
    return {
      id: clause.id,
      reference: clause.reference,
      text: clause.text,
      topic: dominantDimension(assessment.dimensionScores),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Engine 02 — pure functions                                          */
/* ------------------------------------------------------------------ */

/** Deterministic what-if evaluation: match provisions, project consequences. */
export function evaluateScenario(contract: Contract, scenario: string): ScenarioResult {
  const kind = detectScenarioKind(scenario);
  const scenarioObject: Scenario = {
    id: "s1",
    description: scenario,
    kind,
  };

  const provisions = matchProvisions(contract.provisions, scenario);
  const matchedTopics = new Set(provisions.map((p) => p.topic));

  const consequences: Consequence[] = [];
  let index = 0;
  for (const template of CONSEQUENCE_TEMPLATES[kind]) {
    const topicHit = template.topics.length === 0 || template.topics.some((t) => matchedTopics.has(t));
    if (!topicHit && consequences.length >= 2) {
      continue;
    }
    index += 1;
    const provision = provisions[index - 1] ?? null;
    let severity = template.severity;
    if (provision !== null) {
      // Provision-level risk nudges the template severity one step up/down.
      const provisionRisk = assessClauseRisk({
        id: provision.id,
        reference: provision.reference,
        title: provision.topic,
        text: provision.text,
      });
      if (provisionRisk.riskLevel === "critical" && severity === "high") {
        severity = "critical";
      } else if (provisionRisk.riskLevel === "low" && severity === "critical") {
        severity = "high";
      }
    }
    consequences.push({
      id: `k${index}`,
      provisionId: provision?.id ?? null,
      description: template.description,
      severity,
      timeHorizon: template.timeHorizon,
      cascade: [],
      mitigations: [...template.mitigations],
    });
  }

  const summary = `${kind} scenario — ${provisions.length} provision(s) implicated, ${consequences.length} likely consequence(s).`;

  return {
    scenario: scenarioObject,
    provisions,
    consequences,
    summary,
  };
}

/**
 * Flatten consequences into the full chain: direct consequences plus one
 * entry per declared cascade step (severity attenuates one step).
 */
export function mapConsequences(result: ScenarioResult): Consequence[] {
  const expanded: Consequence[] = [];
  for (const consequence of result.consequences) {
    expanded.push(consequence);
    consequence.cascade.forEach((step, index) => {
      expanded.push({
        id: `${consequence.id}-k${index + 1}`,
        provisionId: consequence.provisionId,
        description: step,
        severity: attenuate(consequence.severity),
        timeHorizon: consequence.timeHorizon,
        cascade: [],
        mitigations: [],
      });
    });
  }
  return expanded;
}

function attenuate(level: RiskLevel): RiskLevel {
  switch (level) {
    case "critical":
      return "high";
    case "high":
      return "medium";
    case "medium":
      return "low";
    case "low":
      return "low";
  }
}

const SEVERITY_BASE: Readonly<Record<RiskLevel, number>> = {
  low: 0.2,
  medium: 0.45,
  high: 0.7,
  critical: 0.88,
};

const IMMEDIATE_HORIZONS: readonly string[] = ["immediate", "14 days", "30 days"];

/** Calibrate likelihood of a consequence under the given scenario. */
export function computeRiskProbability(consequence: Consequence): RiskProbability {
  let value = SEVERITY_BASE[consequence.severity];
  if (consequence.timeHorizon !== null && IMMEDIATE_HORIZONS.includes(consequence.timeHorizon)) {
    value += 0.08;
  }
  value -= consequence.mitigations.length * 0.04;
  value = Math.round(Math.min(0.95, Math.max(0.05, value)) * 100) / 100;

  let band: RiskProbability["band"];
  if (value < 0.2) {
    band = "rare";
  } else if (value < 0.4) {
    band = "unlikely";
  } else if (value < 0.6) {
    band = "possible";
  } else if (value < 0.8) {
    band = "likely";
  } else {
    band = "near-certain";
  }

  return { band, value };
}

export function toScenarioClauses(contract: Contract): Clause[] {
  return contract.provisions.map((p) => ({
    id: p.id,
    reference: p.reference,
    title: p.topic,
    text: p.text,
  }));
}

/* ------------------------------------------------------------------ */
/* Statutory references (offline, deterministic)                       */
/* ------------------------------------------------------------------ */

const LAW_REFERENCES: Readonly<Record<ScenarioKind, readonly LawReference[]>> = {
  breach: [
    { act: "ICA", section: "§ 37", title: "Obligation of parties to perform contracts" },
    { act: "ICA", section: "§ 73", title: "Compensation for loss or damage caused by breach" },
    { act: "ICA", section: "§ 74", title: "Compensation for breach where a stipulated sum is named" },
  ],
  termination: [
    { act: "ICA", section: "§ 39", title: "Voidable at aggrieved party's option when performance is refused" },
    { act: "ICA", section: "§ 62", title: "Effect of novation, rescission and alteration of contract" },
    { act: "TPA", section: "§ 108", title: "Rights and liabilities of lessor and lessee (leases)" },
  ],
  payment: [
    { act: "ICA", section: "§ 37", title: "Obligation of parties to perform contracts" },
    { act: "ICA", section: "§ 55", title: "Compensation for breach caused by default in performance" },
    { act: "ICA", section: "§ 74", title: "Penalty and stipulated damages" },
  ],
  dispute: [
    { act: "ICA", section: "§ 73", title: "Compensation for loss or damage caused by breach" },
    { act: "BNS", section: "§ 318", title: "Cheating and dishonestly inducing delivery of property" },
    { act: "SRA", section: "Injunctions", title: "Specific Relief Act, 1963 — injunctive relief" },
  ],
  renewal: [
    { act: "ICA", section: "§ 25", title: "Agreements without consideration (nudum pactum)" },
    { act: "ICA", section: "§ 62", title: "Effect of novation and alteration on continuing terms" },
    { act: "TPA", section: "§ 106", title: "Leases how made — term and renewal formality" },
  ],
  general: [
    { act: "ICA", section: "§ 37", title: "Obligation of parties to perform contracts" },
    { act: "ICA", section: "§ 56", title: "Agreement to do an impossible act (frustration / force majeure)" },
    { act: "ICA", section: "§ 23", title: "What considerations and objects are lawful" },
  ],
};

/** Map a scenario result to the statutory provisions that govern it. */
export function mapLawReferences(result: ScenarioResult): LawReference[] {
  const references: LawReference[] = [];
  const seen = new Set<string>();

  for (const reference of LAW_REFERENCES[result.scenario.kind]) {
    const key = `${reference.act}-${reference.section}`;
    if (!seen.has(key)) {
      seen.add(key);
      references.push(reference);
    }
  }
  for (const provision of result.provisions) {
    const key = `contract-${provision.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      references.push({
        act: "CONTRACT",
        section: provision.reference,
        title: `${provision.topic} provision governing this outcome`,
      });
    }
  }

  return references;
}
