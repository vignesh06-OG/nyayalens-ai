import { generateObject, streamText } from "ai";
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
import { applySecurityHeaders } from "@/lib/http";
import { getContract } from "@/lib/contractStore";
import {
  AiAnalysisOutputSchema,
  AiCompareOutputSchema,
  AiSimplifyOutputSchema,
  type AiAnalysisOutput,
  type AiClauseInsight,
  type CompletionMode,
} from "@/lib/validation/schema";

import {
  FALLBACK_MESSAGE,
  composeAnalysisNarrative,
  composeCompareNarrative,
  composeEmailDraft,
  composeSimulationCards,
  fallbackAnalyze,
  fallbackSimplify,
} from "./fallback";
import {
  buildAnalysisNarrativePrompt,
  buildAnalyzePrompt,
  buildComparePrompt,
  buildEmailPrompt,
  buildSimplifyPrompt,
  buildSimplifyStreamPrompt,
  buildSimulationCardsPrompt,
  buildSimulationStreamPrompt,
  type PromptBundle,
} from "./prompts";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

/** Hard timeout per GenAI call (spec: 30 seconds). */
export const AI_TIMEOUT_MS = 30_000;

/** Heavy reasoning (analysis, comparison, simulation). */
export const ANALYSIS_MODEL = "gpt-4o";

/** High-volume transforms (simplification). */
export const SIMPLIFICATION_MODEL = "gpt-4o-mini";

export interface AiCallMeta {
  /** True when the rule-based fallback answered instead of the AI. */
  degraded: boolean;
  /** Graceful degradation notice (null on the happy path). */
  message: string | null;
}

function timeoutSignal(): AbortSignal {
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
/* Simulation (streamText narrative + rule-based structured baseline)  */
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

/**
 * Streaming narrative via streamText. Returns null when the AI layer cannot
 * start (missing key, immediate failure) so callers fall back to the
 * rule-based structured result.
 */
export async function simulateWithAiStream(
  contract: Contract,
  scenario: string,
): Promise<Response | null> {
  if (!hasApiKey()) {
    return null;
  }

  try {
    const promptBundle = buildSimulationStreamPrompt(contract, scenario);
    const result = streamText({
      model: openai(ANALYSIS_MODEL),
      system: promptBundle.system,
      prompt: promptBundle.prompt,
      abortSignal: timeoutSignal(),
    });
    return applySecurityHeaders(result.toDataStreamResponse());
  } catch (error) {
    console.error("simulateWithAiStream: AI unavailable:", error);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Streaming completions (useChat / useCompletion text protocol)       */
/* ------------------------------------------------------------------ */

export interface CompletionRequest {
  mode: CompletionMode;
  prompt: string;
  documentType?: ContractKind;
  targetLevel?: number;
  language?: "en" | "hi";
  contractId?: string;
  docB?: string;
}

function hasApiKey(): boolean {
  return process.env.OPENAI_API_KEY !== undefined && process.env.OPENAI_API_KEY.length > 0;
}

/** Chunked plain-text stream for the rule-based fallback (word-by-word). */
function streamRuleText(text: string): Response {
  const encoder = new TextEncoder();
  const pieces = text.split(/(\s+)/);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (let i = 0; i < pieces.length; i += 3) {
        controller.enqueue(encoder.encode(pieces.slice(i, i + 3).join("")));
        await new Promise((resolve) => setTimeout(resolve, 28));
      }
      controller.close();
    },
  });
  return applySecurityHeaders(
    new Response(stream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-nyayalens-degraded": "1",
      },
    }),
  );
}

async function streamAiText(promptBundle: PromptBundle, model: string): Promise<Response> {
  const result = streamText({
    model: openai(model),
    system: promptBundle.system,
    prompt: promptBundle.prompt,
    abortSignal: timeoutSignal(),
  });
  return applySecurityHeaders(result.toTextStreamResponse());
}

/**
 * Unified streaming entry point for the workbench sections.
 * AI when a key is configured; deterministic rule-based narrative otherwise.
 * Plain-text stream (useCompletion/useChat with streamProtocol: "text").
 */
export async function streamCompletion(request: CompletionRequest): Promise<Response> {
  const fallbackMode = !hasApiKey();

  try {
    switch (request.mode) {
      case "analysis": {
        const fallback = fallbackAnalyze(request.prompt, request.documentType ?? "other");
        if (fallbackMode) {
          return streamRuleText(composeAnalysisNarrative(fallback.result));
        }
        return await streamAiText(
          buildAnalysisNarrativePrompt(request.prompt, request.documentType ?? "other"),
          ANALYSIS_MODEL,
        );
      }
      case "simulate": {
        const contract = request.contractId !== undefined ? getContract(request.contractId) : null;
        if (contract === null) {
          throw new Error("Unknown contractId. Run adversarial analysis first.");
        }
        if (fallbackMode) {
          return streamRuleText(composeSimulationCards(contract, request.prompt));
        }
        return await streamAiText(buildSimulationCardsPrompt(contract, request.prompt), ANALYSIS_MODEL);
      }
      case "simplify": {
        const targetLevel = request.targetLevel ?? 8;
        const language = request.language ?? "en";
        if (fallbackMode) {
          const simplified = fallbackSimplify(request.prompt, targetLevel);
          const note =
            language === "hi"
              ? `${FALLBACK_MESSAGE}\n(Hindi rendering needs the AI layer — English rule-based output below.)\n\n`
              : `${FALLBACK_MESSAGE}\n\n`;
          return streamRuleText(note + simplified.simplified);
        }
        return await streamAiText(
          buildSimplifyStreamPrompt(request.prompt, targetLevel, language),
          SIMPLIFICATION_MODEL,
        );
      }
      case "compare": {
        const base: Document = { id: "A", title: "Version A", kind: "other", text: request.prompt };
        const target: Document = {
          id: "B",
          title: "Version B",
          kind: "other",
          text: request.docB ?? "",
        };
        if (fallbackMode) {
          return streamRuleText(composeCompareNarrative(base, target));
        }
        return await streamAiText(buildComparePrompt(base.text, target.text), ANALYSIS_MODEL);
      }
      case "email": {
        const { result } = fallbackAnalyze(request.prompt, request.documentType ?? "other");
        if (fallbackMode) {
          return streamRuleText(composeEmailDraft(result));
        }
        return await streamAiText(buildEmailPrompt(request.prompt), SIMPLIFICATION_MODEL);
      }
    }
  } catch (error) {
    console.error(`streamCompletion(${request.mode}) failed:`, error);
    throw error;
  }
}
