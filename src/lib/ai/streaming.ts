import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

import type { Document } from "@/domain/comparison/types";
import { runNegotiation } from "@/domain/negotiation/engine";
import type { Contract, ContractKind } from "@/domain/simulation/types";
import { getContract } from "@/lib/contractStore";
import { applySecurityHeaders } from "@/lib/http";
import type { CompletionMode } from "@/lib/validation/schema";

import {
  FALLBACK_MESSAGE,
  fallbackAnalyze,
  fallbackSimplify,
} from "./fallback";
import {
  composeAnalysisNarrative,
  composeCompareNarrative,
  composeEmailDraft,
  composeNegotiationNarrative,
  composeSimulationCards,
} from "./narratives";
import {
  buildAnalysisNarrativePrompt,
  buildComparePrompt,
  buildEmailPrompt,
  buildNegotiationNarrativePrompt,
  buildSimulationCardsPrompt,
  buildSimulationStreamPrompt,
  buildSimplifyStreamPrompt,
  type PromptBundle,
} from "./prompts";
import { ANALYSIS_MODEL, SIMPLIFICATION_MODEL, timeoutSignal } from "./provider";

/**
 * Streaming layer — every plain-text stream the workbench consumes
 * (useCompletion / useChat with streamProtocol: "text"). AI when a key is
 * configured; deterministic rule narratives otherwise. Split from provider.ts
 * so structured (generateObject) and streaming (streamText) concerns stay
 * one-module-each.
 */

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
 * Streaming simulation narrative via streamText. Returns null when the AI
 * layer cannot start (missing key, immediate failure) so callers fall back to
 * the rule-based structured result.
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

function requireContract(contractId: string | undefined): Contract {
  const contract = contractId !== undefined ? getContract(contractId) : null;
  if (contract === null) {
    throw new Error("Unknown contractId. Run adversarial analysis first.");
  }
  return contract;
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
        const contract = requireContract(request.contractId);
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
      case "negotiate": {
        const contract = requireContract(request.contractId);
        if (fallbackMode) {
          return streamRuleText(
            composeNegotiationNarrative(runNegotiation(contract, request.prompt), contract.title),
          );
        }
        return await streamAiText(
          buildNegotiationNarrativePrompt(contract, request.prompt),
          ANALYSIS_MODEL,
        );
      }
    }
  } catch (error) {
    console.error(`streamCompletion(${request.mode}) failed:`, error);
    throw error;
  }
}
