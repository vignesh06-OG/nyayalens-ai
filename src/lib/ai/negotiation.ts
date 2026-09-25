import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";

import { runNegotiation } from "@/domain/negotiation/engine";
import type { NegotiationResult } from "@/domain/negotiation/types";
import type { Contract } from "@/domain/simulation/types";
import {
  AiNegotiationOutputSchema,
  type AiNegotiationOutput,
} from "@/lib/validation/schema";

import { FALLBACK_MESSAGE } from "./fallback";
import { buildNegotiationPrompt } from "./prompts";
import { ANALYSIS_MODEL, timeoutSignal, type AiCallMeta } from "./provider";

/**
 * Engine 06 AI integration — three-agent adversarial negotiation.
 * The deterministic engine produces the skeleton (rounds, stances, citations,
 * convergence, redlines); GenAI re-voices the positions with contract-specific
 * language. Citations and convergence NEVER come from the model — statutory
 * grounding stays rule-pinned so the AI cannot invent law.
 */

export interface NegotiateOutcome extends AiCallMeta {
  result: NegotiationResult;
}

/** Overlay AI-authored position text on the rule skeleton (pure). */
export function mergeAiNegotiation(
  rule: NegotiationResult,
  object: AiNegotiationOutput,
): NegotiationResult {
  const rounds = rule.rounds.map((round, index) => {
    const ai = object.rounds[index];
    if (ai === undefined) {
      return round;
    }
    return {
      ...round,
      partyA: { ...round.partyA, position: ai.partyAPosition },
      partyB: { ...round.partyB, position: ai.partyBPosition },
      mediator: { ...round.mediator, gapSummary: ai.mediatorGap, suggestion: ai.mediatorSuggestion },
    };
  });

  return {
    ...rule,
    rounds,
    // The disclaimer and statutory basis are appended by rule, never by model.
    finalSummary:
      `${object.finalSummary} Statutory basis: ${rule.statutoryBasis.slice(0, 4).join(", ")}. ` +
      "Not legal advice — verify the final redline with a qualified professional.",
  };
}

export async function negotiateContract(
  contract: Contract,
  userGoal: string,
): Promise<NegotiateOutcome> {
  const rule = runNegotiation(contract, userGoal);

  try {
    const promptBundle = buildNegotiationPrompt(contract, userGoal);
    const { object } = await generateObject({
      model: openai(ANALYSIS_MODEL),
      schema: AiNegotiationOutputSchema,
      system: promptBundle.system,
      prompt: promptBundle.prompt,
      abortSignal: timeoutSignal(),
    });
    return { result: mergeAiNegotiation(rule, object), degraded: false, message: null };
  } catch (error) {
    console.error("negotiateContract: AI unavailable, using rule-based fallback:", error);
    return { result: rule, degraded: true, message: FALLBACK_MESSAGE };
  }
}
