import { randomUUID } from "node:crypto";
import type { NextResponse } from "next/server";

import { provisionsFromClauses } from "@/domain/simulation/engine";
import { analyzeDocument } from "@/lib/ai/provider";
import { saveContract } from "@/lib/contractStore";
import { jsonError, jsonOk } from "@/lib/http";
import { checkRateLimit, clientKey } from "@/lib/security/rateLimit";
import { sanitizeText } from "@/lib/security/sanitize";
import { AnalyzeInputSchema, formatZodError } from "@/lib/validation/schema";

export const runtime = "nodejs";

/**
 * POST /api/analyze — adversarial analysis (Engine 01).
 * validate → rate limit → sanitize → AI (fallback: rules) → typed JSON.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = AnalyzeInputSchema.safeParse(body);
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

    // Register the contract so /api/simulate can reference it by id.
    const contractId = randomUUID();
    saveContract({
      id: contractId,
      title: outcome.clauses[0]?.title ?? "Untitled contract",
      kind: parsed.data.documentType,
      text: documentText,
      provisions: provisionsFromClauses(outcome.clauses),
    });

    return jsonOk({
      contractId,
      clauses: outcome.clauses,
      assessments: outcome.result.assessments,
      heatmap: outcome.result.heatmap,
      obligations: outcome.result.obligations,
      riskScore: outcome.result.riskScore,
      degraded: outcome.degraded,
      message: outcome.message,
    });
  } catch (error) {
    console.error("POST /api/analyze failed:", error);
    return jsonError("Internal error", 500);
  }
}
