import { jsonError } from "@/lib/http";
import { streamCompletion, type CompletionRequest } from "@/lib/ai/streaming";
import { checkRateLimit, clientKey } from "@/lib/security/rateLimit";
import { sanitizeText } from "@/lib/security/sanitize";
import {
  StreamRequestSchema,
  formatZodError,
  promptFromStreamRequest,
  type StreamRequest,
} from "@/lib/validation/schema";

export const runtime = "nodejs";

/**
 * POST /api/completion — plain-text streaming for useChat / useCompletion.
 * validate → rate limit → sanitize → AI stream (fallback: rule narrative).
 *
 * Accepts both Vercel AI SDK wire shapes: { prompt, ... } (useCompletion)
 * and { messages, ... } (useChat).
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = StreamRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(formatZodError(parsed.error), 400);
  }

  const decision = checkRateLimit(clientKey(request));
  if (!decision.allowed) {
    return jsonError("Rate limit exceeded — try again shortly.", 429, [
      { key: "Retry-After", value: String(decision.retryAfterSeconds) },
    ]);
  }

  const input: StreamRequest = parsed.data;
  const rawPrompt = promptFromStreamRequest(input);
  const prompt = sanitizeText(rawPrompt, 20_000);
  if (prompt.length < 3) {
    return jsonError("Invalid input: prompt is too short", 400);
  }

  const completionRequest: CompletionRequest = {
    mode: input.mode,
    prompt,
    documentType: input.documentType,
    targetLevel: input.targetLevel,
    language: input.language,
    contractId: input.contractId,
    docB: input.docB !== undefined ? sanitizeText(input.docB, 20_000) : undefined,
  };

  try {
    return await streamCompletion(completionRequest);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message.includes("Unknown contractId")) {
      return jsonError(message, 404);
    }
    console.error("POST /api/completion failed:", error);
    return jsonError("Internal error", 500);
  }
}
