import type { NextResponse } from "next/server";

import { generateActionKit } from "@/domain/actions/engine";
import { analyzeDocument } from "@/lib/ai/provider";
import { jsonError, jsonOk } from "@/lib/http";
import { checkRateLimit, clientKey } from "@/lib/security/rateLimit";
import { sanitizeText } from "@/lib/security/sanitize";
import { ActionsInputSchema, formatZodError } from "@/lib/validation/schema";

export const runtime = "nodejs";

/**
 * POST /api/actions — action kit generation (Engine 04).
 * validate → rate limit → sanitize → AI analysis (fallback: rules)
 * → pure generateActionKit → typed JSON.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = ActionsInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(formatZodError(parsed.error), 400);
  }

  const decision = checkRateLimit(clientKey(request));
  if (!decision.allowed) {
    return jsonError("Rate limit exceeded — try again shortly.", 429, [
      { key: "Retry-After", value: String(decision.retryAfterSeconds) },
    ]);
  }

  const documentText = sanitizeText(parsed.data.documentText, 50_000);

  try {
    const outcome = await analyzeDocument({
      documentText,
      documentType: parsed.data.documentType,
    });

    // Engine 04 is a pure derivation over the analysis result.
    const actionKit = generateActionKit(outcome.result);

    return jsonOk({
      actionKit,
      riskScore: outcome.result.riskScore,
      degraded: outcome.degraded,
      message: outcome.message,
    });
  } catch (error) {
    console.error("POST /api/actions failed:", error);
    return jsonError("Internal error", 500);
  }
}
