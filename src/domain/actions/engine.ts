import { dominantDimension } from "../analysis/engine";
import type { AnalysisResult, Clause, RiskAssessment, RiskLevel } from "../analysis/types";
import type {
  ActionKit,
  AmendmentDraft,
  ComplianceChecklistItem,
  LawyerQuestion,
  NegotiationPoint,
} from "./types";

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

const LEVEL_WEIGHTS: Readonly<Record<RiskLevel, number>> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const EMPTY_CLAUSE: Clause = { id: "", reference: "—", title: "Untitled clause", text: "" };

function clauseById(analysis: AnalysisResult): Map<string, Clause> {
  return new Map(analysis.clauses.map((c): [string, Clause] => [c.id, c]));
}

function askFor(assessment: RiskAssessment): string {
  const dimension = dominantDimension(assessment.dimensionScores);
  switch (dimension) {
    case "liability":
      return "Cap liability at 12 months' fees and exclude consequential damages.";
    case "payment":
      return "Add a payment grace period and cap late fees at 1.5% per month.";
    case "termination":
      return "Add a 30-day cure period and mutual termination on notice.";
    case "renewal":
      return "Delete auto-renewal or add a 60-day no-renewal notice window.";
    case "confidentiality":
      return "Make confidentiality mutual with a 3-year sunset and standard carve-outs.";
    case "ambiguity":
      return "Replace subjective standards with objective, defined triggers.";
  }
}

function priorityFor(assessment: RiskAssessment): number {
  return Math.min(10, Math.max(1, Math.round(assessment.score / 10)));
}

const AMENDMENT_TEMPLATES: ReadonlyArray<{
  match: readonly string[];
  insertion: string;
  rationale: string;
  fallbackPosition: string;
}> = [
  {
    match: ["liability", "indemn", "unlimited", "consequential"],
    insertion:
      "Each party's aggregate liability shall not exceed the fees paid in the 12 months preceding the claim. Neither party is liable for indirect or consequential damages.",
    rationale: "Caps exposure and removes open-ended consequential-damages risk.",
    fallbackPosition: "Accept a 24-month cap if the 12-month cap is refused.",
  },
  {
    match: ["renew", "auto-renew", "evergreen"],
    insertion:
      "This agreement does not renew automatically. Either party may decline renewal by written notice at least 60 days before the term ends.",
    rationale: "Removes the auto-renewal trap and restores an exit at each term end.",
    fallbackPosition: "Keep auto-renewal but require a 30-day reminder notice before it bites.",
  },
  {
    match: ["terminat", "forfeit", "evict"],
    insertion:
      "Termination for breach requires 30 days' written notice and a chance to cure. Termination for convenience requires 30 days' notice from either side.",
    rationale: "Introduces a cure window and mutual convenience exit.",
    fallbackPosition: "Accept a 15-day cure period if 30 days is refused.",
  },
  {
    match: ["payment", "late fee", "deposit", "rent", "penalty", "interest"],
    insertion:
      "Amounts due carry a 7-day grace period. Late fees are capped at 1.5% per month. Deposits are refunded within 14 days of exit, less documented, itemised deductions.",
    rationale: "Adds breathing room on money terms and makes deposits refundable.",
    fallbackPosition: "Accept 1.5% late fees in exchange for the grace period.",
  },
  {
    match: ["confidential", "non-disclosure", "proprietary"],
    insertion:
      "Confidentiality obligations are mutual, last 3 years after termination, and exclude information that is public, independently developed, or lawfully received from a third party.",
    rationale: "Balances the NDA and time-limits the gag.",
    fallbackPosition: "Accept 5 years if carve-outs are included.",
  },
  {
    match: ["sole discretion", "reasonable", "material", "discretion"],
    insertion: "Discretion under this clause must be exercised reasonably and in good faith.",
    rationale: "Converts a subjective standard into an enforceable one.",
    fallbackPosition: "Add an objective definition of the triggering standard.",
  },
];

function templateFor(clause: Clause, issue: string) {
  const haystack = `${issue} ${clause.text}`.toLowerCase();
  for (const template of AMENDMENT_TEMPLATES) {
    if (template.match.some((m) => haystack.includes(m))) {
      return template;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Engine 04 — pure functions                                          */
/* ------------------------------------------------------------------ */

/** Turn an analysis into negotiation levers, amendments, and a playbook. */
export function generateActionKit(analysis: AnalysisResult): ActionKit {
  const clauses = clauseById(analysis);

  const points: NegotiationPoint[] = [];
  for (const assessment of analysis.assessments) {
    if (assessment.riskLevel === "low") {
      continue;
    }
    const clause = clauses.get(assessment.clauseId) ?? EMPTY_CLAUSE;
    const issue = assessment.drivers[0] ?? `${assessment.riskLevel} risk`;
    points.push({
      id: `np-${assessment.clauseId}`,
      clauseId: assessment.clauseId,
      title: clause.title.length > 0 ? clause.title : clause.reference,
      rationale: assessment.drivers.length > 0 ? assessment.drivers.join("; ") : issue,
      ask: askFor(assessment),
      severity: assessment.riskLevel,
      priority: priorityFor(assessment),
      tradeable: assessment.riskLevel !== "critical",
    });
  }

  const negotiationPoints = prioritizeNegotiationPoints(points);

  const amendments: AmendmentDraft[] = negotiationPoints
    .slice(0, 5)
    .map((point) => {
      const clause = clauses.get(point.clauseId) ?? EMPTY_CLAUSE;
      return draftAmendment(clause, point.rationale);
    });

  const questionsForLawyer = buildQuestions(analysis, clauses);
  const playbook = buildPlaybook(negotiationPoints);

  return { negotiationPoints, amendments, questionsForLawyer, playbook };
}

/**
 * Deal-breakers first: priority desc, then severity weight, then firm asks
 * (non-tradeable) before tradeable ones. Returns a new array.
 */
export function prioritizeNegotiationPoints(points: readonly NegotiationPoint[]): NegotiationPoint[] {
  return [...points].sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    const weight = LEVEL_WEIGHTS[b.severity] - LEVEL_WEIGHTS[a.severity];
    if (weight !== 0) {
      return weight;
    }
    if (a.tradeable !== b.tradeable) {
      return a.tradeable ? 1 : -1;
    }
    return a.id.localeCompare(b.id);
  });
}

/** Deterministic redline draft for a clause + stated issue. */
export function draftAmendment(clause: Clause, issue: string): AmendmentDraft {
  const template = templateFor(clause, issue);
  const insertion =
    template?.insertion ??
    "The parties shall perform this clause in good faith, subject to written notice and a reasonable cure period.";
  const rationale =
    template?.rationale ?? "Restores balance and adds procedural fairness to the clause.";
  const fallbackPosition = template?.fallbackPosition ?? null;

  return {
    id: `am-${clause.id.length > 0 ? clause.id : "x"}`,
    clauseId: clause.id,
    issue,
    originalText: clause.text,
    proposedText: `${clause.text.trim()}\n\n[PROPOSED] ${insertion}`,
    rationale,
    fallbackPosition,
  };
}

function buildQuestions(analysis: AnalysisResult, clauses: Map<string, Clause>): LawyerQuestion[] {
  const questions: LawyerQuestion[] = [];

  for (const assessment of analysis.assessments) {
    const clause = clauses.get(assessment.clauseId) ?? EMPTY_CLAUSE;
    const top = dominantDimension(assessment.dimensionScores);
    if (top === "ambiguity" && assessment.score >= 40 && questions.length < 5) {
      questions.push({
        id: `q-${assessment.clauseId}-amb`,
        question: `What is the intended standard in “${clause.title}”? Subjective wording like this is litigated most often.`,
        topic: "ambiguity",
        whyItMatters: "Ambiguous standards are interpreted against the drafter — know which side that is.",
      });
    }
  }

  for (const obligation of analysis.obligations) {
    if (obligation.deadline === null && questions.length < 5) {
      questions.push({
        id: `q-${obligation.id}`,
        question: `Is there a deadline for: “${obligation.action.slice(0, 90)}…”?`,
        topic: "obligations",
        whyItMatters: "Undated obligations become disputes at the worst possible moment.",
      });
    }
    if (questions.length >= 5) {
      break;
    }
  }

  return questions;
}

function buildPlaybook(points: readonly NegotiationPoint[]): string[] {
  const steps: string[] = [];
  for (const point of points.slice(0, 3)) {
    steps.push(`Lead with “${point.title}” — ${point.ask}`);
  }
  if (points.some((p) => !p.tradeable)) {
    steps.push("Mark non-tradeable asks as signature conditions; concede only in writing.");
  }
  steps.push("Attach a redline of every proposed amendment to your counter.");
  steps.push("Escalate unresolved deal-breakers to counsel before signature.");
  return steps;
}

/**
 * Compliance checklist derived from extracted obligations (pure).
 * Undated obligations surface first — they are the sneakiest exposure.
 */
export function buildComplianceChecklist(analysis: AnalysisResult): ComplianceChecklistItem[] {
  const clauses = clauseById(analysis);

  const items: ComplianceChecklistItem[] = analysis.obligations.map((obligation, index) => {
    const clause = clauses.get(obligation.clauseId);
    return {
      id: `cc-${obligation.id || index + 1}`,
      task: obligation.action,
      due: obligation.deadline,
      party: obligation.party,
      sourceClause: clause?.reference ?? "—",
    };
  });

  return items.sort((a, b) => {
    const aUndated = a.due === null ? 0 : 1;
    const bUndated = b.due === null ? 0 : 1;
    return aUndated - bUndated;
  });
}
