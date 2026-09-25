import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";

import {
  assessClauseRisk,
  computeRiskScore,
  extractObligations,
  generateHeatmapData,
  segmentClauses,
} from "@/domain/analysis/engine";
import type { AnalysisResult, Clause, Obligation, RiskAssessment } from "@/domain/analysis/types";
import {
  assessRiskDelta,
  computeSemanticDiff,
} from "@/domain/comparison/engine";
import type { DiffResult, Document, RiskDelta } from "@/domain/comparison/types";
import { assessReadability } from "@/domain/simplification/engine";
import type { SimplifiedText } from "@/domain/simplification/types";
import {
  computeRiskProbability,
  evaluateScenario,
  mapConsequences,
} from "@/domain/simulation/engine";
import type {
  Consequence,
  Contract,
  ContractKind,
  RiskProbability,
  ScenarioResult,
} from "@/domain/simulation/types";
import {
  AiAnalysisOutputSchema,
  AiCompareOutputSchema,
  AiSimplifyOutputSchema,
  type AiAnalysisOutput,
  type AiClauseInsight,
} from "@/lib/validation/schema";

import {
  FALLBACK_MESSAGE,
  fallbackAnalyze,
  fallbackSimplify,
} from "./fallback";
import {
  buildAnalyzePrompt,
  buildComparePrompt,
  buildSimplifyPrompt,
} from "./prompts";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

/** Hard timeout per GenAI call (spec: 30 seconds). */
export const AI_TIMEOUT_MS = 30_000;

/** Heavy reasoning (analysis, comparison, simulation, negotiation). */
export const ANALYSIS_MODEL = "gpt-4o";

/** High-volume transforms (simplification). */
export const SIMPLIFICATION_MODEL = "gpt-4o-mini";

export interface AiCallMeta {
  /** True when the rule-based fallback answered instead of the AI. */
  degraded: boolean;
  /** Graceful degradation notice (null on the happy path). */
  message: string | null;
}

export function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(AI_TIMEOUT_MS);
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/* ------------------------------------------------------------------ */
/* Analysis (generateObject → domain merge, fallback on failure)       */
/* ------------------------------------------------------------------ */

export interface AnalyzeOutcome extends AiCallMeta {
  clauses: Clause[];
  result: AnalysisResult;
}

function mapAiObligations(insight: AiClauseInsight, clauseId: string, startId: number): Obligation[] {
  return insight.obligations.map((obligation, index) => ({
    id: `o${startId + index}`,
    clauseId,
    party: obligation.party,
    action: obligation.action,
    trigger: obligation.trigger,
    deadline: obligation.deadline,
  }));
}

function mergeAiAnalysis(clauses: Clause[], output: AiAnalysisOutput): AnalyzeOutcome {
  const obligations: Obligation[] = [];
  let obligationId = 0;

  const assessments: RiskAssessment[] = clauses.map((clause, index) => {
    const insight = output.clauses[index] ?? null;
    const rule = assessClauseRisk(clause);
    if (insight === null) {
      return rule;
    }
    obligationId += insight.obligations.length;
    obligations.push(...mapAiObligations(insight, clause.id, obligationId - insight.obligations.length + 1));
    return {
      clauseId: clause.id,
      riskLevel: insight.riskLevel,
      score: clampScore(insight.score),
      drivers: insight.drivers.slice(0, 5),
      // Heatmap dimensions stay rule-derived for stable, comparable cells.
      dimensionScores: rule.dimensionScores,
    };
  });

  const finalObligations = obligations.length > 0 ? obligations : extractObligations(clauses);

  return {
    clauses,
    result: {
      clauses,
      assessments,
      heatmap: generateHeatmapData(clauses, assessments),
      obligations: finalObligations,
      riskScore: computeRiskScore(assessments),
    },
    degraded: false,
    message: null,
  };
}

/** Adversarial analysis with automatic rule-based degradation. */
export async function analyzeDocument(input: {
  documentText: string;
  documentType: ContractKind;
}): Promise<AnalyzeOutcome> {
  const clauses = segmentClauses(input.documentText);

  try {
    const promptBundle = buildAnalyzePrompt(input.documentText, input.documentType);
    const { object } = await generateObject({
      model: openai(ANALYSIS_MODEL),
      schema: AiAnalysisOutputSchema,
      system: promptBundle.system,
      prompt: promptBundle.prompt,
      abortSignal: timeoutSignal(),
    });
    return mergeAiAnalysis(clauses, object);
  } catch (error) {
    console.error("analyzeDocument: AI unavailable, using rule-based fallback:", error);
    const fallback = fallbackAnalyze(input.documentText, input.documentType);
    return { ...fallback, degraded: true, message: FALLBACK_MESSAGE };
  }
}

/* ------------------------------------------------------------------ */
/* Simplification (gpt-4o-mini, fallback dictionary)                   */
/* ------------------------------------------------------------------ */

export interface SimplifyOutcome extends AiCallMeta {
  simplified: SimplifiedText;
}

export async function simplifyDocument(input: {
  text: string;
  targetLevel: number;
}): Promise<SimplifyOutcome> {
  try {
    const promptBundle = buildSimplifyPrompt(input.text, input.targetLevel);
    const { object } = await generateObject({
      model: openai(SIMPLIFICATION_MODEL),
      schema: AiSimplifyOutputSchema,
      system: promptBundle.system,
      prompt: promptBundle.prompt,
      abortSignal: timeoutSignal(),
    });
    return {
      simplified: {
        original: input.text,
        simplified: object.simplified,
        targetLevel: input.targetLevel,
        estimatedGrade: assessReadability(object.simplified).fleschKincaidGrade,
        // AI rewrite is holistic — per-phrase replacements apply to the
        // rule-based path only.
        replacements: [],
      },
      degraded: false,
      message: null,
    };
  } catch (error) {
    console.error("simplifyDocument: AI unavailable, using dictionary fallback:", error);
    return {
      simplified: fallbackSimplify(input.text, input.targetLevel),
      degraded: true,
      message: FALLBACK_MESSAGE,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Comparison (domain diff always, AI materiality overlay)             */
/* ------------------------------------------------------------------ */

export interface CompareOutcome extends AiCallMeta {
  diff: DiffResult;
  riskDelta: RiskDelta;
  summary: string;
  materiality: string[];
}

export async function compareDocuments(base: Document, target: Document): Promise<CompareOutcome> {
  const diff = computeSemanticDiff(base, target);
  const riskDelta = assessRiskDelta(diff);

  try {
    const promptBundle = buildComparePrompt(base.text, target.text);
    const { object } = await generateObject({
      model: openai(ANALYSIS_MODEL),
      schema: AiCompareOutputSchema,
      system: promptBundle.system,
      prompt: promptBundle.prompt,
      abortSignal: timeoutSignal(),
    });
    return {
      diff,
      riskDelta,
      summary: object.summary,
      materiality: object.materiality,
      degraded: false,
      message: null,
    };
  } catch (error) {
    console.error("compareDocuments: AI unavailable, using rule-based fallback:", error);
    return {
      diff,
      riskDelta,
      summary: diff.summary,
      materiality: riskDelta.movements.map((m) => m.note),
      degraded: true,
      message: FALLBACK_MESSAGE,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Simulation (rule-based structured baseline; streaming lives in      */
/* ./streaming)                                                        */
/* ------------------------------------------------------------------ */

export interface SimulateOutcome {
  result: ScenarioResult;
  consequences: Array<Consequence & { probability: RiskProbability }>;
}

/** Deterministic structured simulation (also the AI-free floor). */
export function runRuleSimulation(contract: Contract, scenario: string): SimulateOutcome {
  const result = evaluateScenario(contract, scenario);
  const consequences = mapConsequences(result).map((consequence) => ({
    ...consequence,
    probability: computeRiskProbability(consequence),
  }));
  return { result, consequences };
}
