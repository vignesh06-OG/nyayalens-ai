import type { NextResponse } from "next/server";

import { formatRedlineDocument } from "@/domain/negotiation/engine";
import { negotiateContract } from "@/lib/ai/negotiation";
import { getContract } from "@/lib/contractStore";
import { jsonError, jsonOk } from "@/lib/http";
import { checkRateLimit, clientKey } from "@/lib/security/rateLimit";
import { sanitizeText } from "@/lib/security/sanitize";
import { NegotiateInputSchema, formatZodError } from "@/lib/validation/schema";

export const runtime = "nodejs";

/**
 * POST /api/negotiate — three-agent negotiation (Engine 06).
 * validate → rate limit → sanitize → AI over rule skeleton (fallback: rules)
 * → typed JSON including a ready-to-download redline document.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = NegotiateInputSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(formatZodError(parsed.error), 400);
  }

  const decision = checkRateLimit(clientKey(request));
  if (!decision.allowed) {
    return jsonError("Rate limit exceeded — try again shortly.", 429, [
      { key: "Retry-After", value: String(decision.retryAfterSeconds) },
    ]);
  }

  const contractId = sanitizeText(parsed.data.contractId, 200);
  const userGoal = sanitizeText(parsed.data.userGoal, 500);

  const contract = getContract(contractId);
  if (contract === null) {
    return jsonError("Unknown contractId. Run /api/analyze first.", 404);
  }

  try {
    const outcome = await negotiateContract(contract, userGoal);
    const { result } = outcome;

    return jsonOk({
      goal: result.goal,
      goalStatement: result.goalStatement,
      rounds: result.rounds,
      finalRedlines: result.finalRedlines,
      agreementScore: result.agreementScore,
      finalSummary: result.finalSummary,
      statutoryBasis: result.statutoryBasis,
      redlineDocument: formatRedlineDocument(result, contract.title),
      degraded: outcome.degraded,
      message: outcome.message,
    });
  } catch (error) {
    console.error("POST /api/negotiate failed:", error);
    return jsonError("Internal error", 500);
  }
}
