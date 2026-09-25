import type { NextResponse } from "next/server";
import type { Document } from "@/domain/comparison/types";

import { compareDocuments } from "@/lib/ai/provider";
import { jsonError, jsonOk } from "@/lib/http";
import { checkRateLimit, clientKey } from "@/lib/security/rateLimit";
import { sanitizeText } from "@/lib/security/sanitize";
import { CompareInputSchema, formatZodError } from "@/lib/validation/schema";

export const runtime = "nodejs";

/**
 * POST /api/compare — clause-level comparison (Engine 05).
 * validate → rate limit → sanitize → domain diff + AI overlay → typed JSON.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = CompareInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(formatZodError(parsed.error), 400);
  }

  const decision = checkRateLimit(clientKey(request));
  if (!decision.allowed) {
    return jsonError("Rate limit exceeded — try again shortly.", 429, [
      { key: "Retry-After", value: String(decision.retryAfterSeconds) },
    ]);
  }

  const docAText = sanitizeText(parsed.data.docA, 50_000);
  const docBText = sanitizeText(parsed.data.docB, 50_000);

  const base: Document = { id: "A", title: "Version A", kind: "other", text: docAText };
  const target: Document = { id: "B", title: "Version B", kind: "other", text: docBText };

  try {
    const outcome = await compareDocuments(base, target);

    return jsonOk({
      diff: outcome.diff,
      riskDelta: outcome.riskDelta,
      summary: outcome.summary,
      materiality: outcome.materiality,
      degraded: outcome.degraded,
      message: outcome.message,
    });
  } catch (error) {
    console.error("POST /api/compare failed:", error);
    return jsonError("Internal error", 500);
  }
}
