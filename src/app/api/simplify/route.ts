import type { NextResponse } from "next/server";

import { simplifyDocument } from "@/lib/ai/provider";
import { jsonError, jsonOk } from "@/lib/http";
import { checkRateLimit, clientKey } from "@/lib/security/rateLimit";
import { sanitizeText } from "@/lib/security/sanitize";
import { SimplifyInputSchema, formatZodError } from "@/lib/validation/schema";

export const runtime = "nodejs";

/**
 * POST /api/simplify — plain-language refracting (Engine 03).
 * validate → rate limit → sanitize → AI (fallback: dictionary) → typed JSON.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = SimplifyInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(formatZodError(parsed.error), 400);
  }

  const decision = checkRateLimit(clientKey(request));
  if (!decision.allowed) {
    return jsonError("Rate limit exceeded — try again shortly.", 429, [
      { key: "Retry-After", value: String(decision.retryAfterSeconds) },
    ]);
  }

  const text = sanitizeText(parsed.data.text, 10_000);

  try {
    const outcome = await simplifyDocument({
      text,
      targetLevel: parsed.data.targetLevel,
    });

    return jsonOk({
      simplified: outcome.simplified,
      degraded: outcome.degraded,
      message: outcome.message,
    });
  } catch (error) {
    console.error("POST /api/simplify failed:", error);
    return jsonError("Internal error", 500);
  }
}
