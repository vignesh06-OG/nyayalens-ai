import { assessClauseRisk, dominantDimension } from "../analysis/engine";
import type { Clause, RiskLevel } from "../analysis/types";
import { getProvision } from "../legal/indian-provisions";
import { CONSEQUENCE_TEMPLATES, SCENARIO_KIND_SIGNALS } from "./templates";
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
/* Statutory references (offline, deterministic — canonical legal DB)  */
/* ------------------------------------------------------------------ */

/**
 * Scenario kind → statute ids from the canonical Indian-provisions database.
 * Ids resolve through getProvision; an unresolved id is skipped rather than
 * crashing the map (data and lookup stay in one place: domain/legal).
 */
const SCENARIO_KIND_PROVISION_IDS: Readonly<Record<ScenarioKind, readonly string[]>> = {
  breach: ["ica-37", "ica-73", "ica-74"],
  termination: ["ica-39", "ica-62", "tpa-108"],
  payment: ["ica-37", "ica-55", "ica-74"],
  dispute: ["ica-73", "bns-318", "sra-injunctions"],
  renewal: ["ica-25", "ica-62", "tpa-106"],
  general: ["ica-37", "ica-56", "ica-23"],
};

/** Map a scenario result to the statutory provisions that govern it. */
export function mapLawReferences(result: ScenarioResult): LawReference[] {
  const references: LawReference[] = [];
  const seen = new Set<string>();

  for (const id of SCENARIO_KIND_PROVISION_IDS[result.scenario.kind]) {
    const provision = getProvision(id);
    if (provision === null) {
      continue;
    }
    const key = `${provision.act}-${provision.section}`;
    if (!seen.has(key)) {
      seen.add(key);
      references.push({ act: provision.act, section: provision.section, title: provision.title });
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
