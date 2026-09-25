import { z } from "zod";

import { CONTRACT_KINDS, type ContractKind } from "@/domain/simulation/types";

/* ------------------------------------------------------------------ */
/* API input schemas                                                   */
/* ------------------------------------------------------------------ */

const documentTypeValues: [ContractKind, ...ContractKind[]] = [...CONTRACT_KINDS];

export const DocumentTypeSchema = z.enum(documentTypeValues);

export const AnalyzeInputSchema = z.object({
  documentText: z.string().min(10).max(50000),
  documentType: DocumentTypeSchema,
});

export const SimulateInputSchema = z.object({
  contractId: z.string(),
  scenario: z.string().min(5).max(500),
});

export const SimplifyInputSchema = z.object({
  text: z.string().min(10).max(10000),
  targetLevel: z.number().min(4).max(12),
});

export const CompareInputSchema = z.object({
  docA: z.string().min(10),
  docB: z.string().min(10),
});

export const ActionsInputSchema = z.object({
  documentText: z.string().min(10).max(50000),
  documentType: DocumentTypeSchema,
});

export const NegotiateInputSchema = z.object({
  contractId: z.string().min(1).max(200),
  userGoal: z.string().min(5).max(500),
});

export type AnalyzeInput = z.infer<typeof AnalyzeInputSchema>;
export type SimulateInput = z.infer<typeof SimulateInputSchema>;
export type SimplifyInput = z.infer<typeof SimplifyInputSchema>;
export type CompareInput = z.infer<typeof CompareInputSchema>;
export type ActionsInput = z.infer<typeof ActionsInputSchema>;
export type NegotiateInput = z.infer<typeof NegotiateInputSchema>;

/* ------------------------------------------------------------------ */
/* AI output schemas (generateObject contracts)                        */
/* ------------------------------------------------------------------ */

export const AiRiskLevelSchema = z.enum(["low", "medium", "high", "critical"]);

export const AiObligationSchema = z.object({
  party: z.enum(["party-a", "party-b", "both"]),
  action: z.string(),
  trigger: z.string().nullable(),
  deadline: z.string().nullable(),
});

export const AiClauseInsightSchema = z.object({
  reference: z.string(),
  title: z.string(),
  summary: z.string(),
  riskLevel: AiRiskLevelSchema,
  score: z.number().min(0).max(100),
  drivers: z.array(z.string()),
  obligations: z.array(AiObligationSchema),
});

export const AiAnalysisOutputSchema = z.object({
  clauses: z.array(AiClauseInsightSchema),
});

export const AiSimplifyOutputSchema = z.object({
  simplified: z.string(),
});

export const AiCompareOutputSchema = z.object({
  summary: z.string(),
  materiality: z.array(z.string()),
});

export const AiNegotiationTurnSchema = z.object({
  partyAPosition: z.string().min(1).max(600),
  partyBPosition: z.string().min(1).max(600),
  mediatorGap: z.string().min(1).max(400),
  mediatorSuggestion: z.string().min(1).max(400),
});

export const AiNegotiationOutputSchema = z.object({
  rounds: z.array(AiNegotiationTurnSchema).length(3),
  finalSummary: z.string().min(1).max(600),
});

export type AiAnalysisOutput = z.infer<typeof AiAnalysisOutputSchema>;
export type AiClauseInsight = z.infer<typeof AiClauseInsightSchema>;
export type AiObligation = z.infer<typeof AiObligationSchema>;
export type AiSimplifyOutput = z.infer<typeof AiSimplifyOutputSchema>;
export type AiCompareOutput = z.infer<typeof AiCompareOutputSchema>;
export type AiNegotiationOutput = z.infer<typeof AiNegotiationOutputSchema>;
export type AiNegotiationTurn = z.infer<typeof AiNegotiationTurnSchema>;

/* ------------------------------------------------------------------ */
/* Streaming completion contracts (useChat / useCompletion)            */
/* ------------------------------------------------------------------ */

export const COMPLETION_MODES = ["analysis", "simulate", "simplify", "compare", "email", "negotiate"] as const;
export type CompletionMode = (typeof COMPLETION_MODES)[number];

const completionExtras = {
  mode: z.enum(COMPLETION_MODES),
  documentType: DocumentTypeSchema.optional(),
  targetLevel: z.number().min(4).max(12).optional(),
  language: z.enum(["en", "hi"]).optional(),
  contractId: z.string().min(1).max(200).optional(),
  docB: z.string().min(10).max(20_000).optional(),
};

/** `useCompletion` posts { prompt, ...body }. */
export const CompletionInputSchema = z.object({
  prompt: z.string().min(3).max(20_000),
  ...completionExtras,
});

/** `useChat` posts { messages, ...body }. */
export const ChatInputSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system", "function", "data"]),
        content: z.string().max(20_000),
      }),
    )
    .min(1)
    .max(50),
  ...completionExtras,
});

export const StreamRequestSchema = z.union([CompletionInputSchema, ChatInputSchema]);

export type CompletionInput = z.infer<typeof CompletionInputSchema>;
export type ChatInput = z.infer<typeof ChatInputSchema>;
export type StreamRequest = z.infer<typeof StreamRequestSchema>;

/** Pull the active prompt out of either wire shape. */
export function promptFromStreamRequest(request: StreamRequest): string {
  if ("prompt" in request) {
    return request.prompt;
  }
  for (let i = request.messages.length - 1; i >= 0; i -= 1) {
    const message = request.messages[i];
    if (message !== undefined && message.role === "user") {
      return message.content;
    }
  }
  return "";
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** First validation issue as a safe, stack-free message. */
export function formatZodError(error: z.ZodError): string {
  const first = error.issues[0];
  return first !== undefined ? `Invalid input: ${first.message}` : "Invalid input";
}
