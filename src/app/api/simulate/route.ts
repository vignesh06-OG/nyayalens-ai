import { FALLBACK_MESSAGE } from "@/lib/ai/fallback";
import { runRuleSimulation } from "@/lib/ai/provider";
import { simulateWithAiStream } from "@/lib/ai/streaming";
import { getContract } from "@/lib/contractStore";
import { jsonError, jsonOk } from "@/lib/http";
import { checkRateLimit, clientKey } from "@/lib/security/rateLimit";
import { sanitizeText } from "@/lib/security/sanitize";
import { SimulateInputSchema, formatZodError } from "@/lib/validation/schema";

export const runtime = "nodejs";

/**
 * POST /api/simulate — scenario simulation (Engine 02).
 * validate → rate limit → sanitize → AI stream (fallback: rules) → response.
 *
 * Success modes: streaming narrative (streamText) when the AI is available,
 * otherwise a typed JSON rule-based assessment with the graceful message.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = SimulateInputSchema.safeParse(body);
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
  const scenario = sanitizeText(parsed.data.scenario, 500);

  const contract = getContract(contractId);
  if (contract === null) {
    return jsonError("Unknown contractId. Run /api/analyze first.", 404);
  }

  try {
    // Preferred mode: streaming narrative from the AI layer.
    const stream = await simulateWithAiStream(contract, scenario);
    if (stream !== null) {
      return stream;
    }

    // Fallback: deterministic structured simulation with graceful message.
    const baseline = runRuleSimulation(contract, scenario);
    return jsonOk({
      scenario: baseline.result.scenario,
      provisions: baseline.result.provisions,
      consequences: baseline.consequences,
      summary: baseline.result.summary,
      degraded: true,
      message: FALLBACK_MESSAGE,
    });
  } catch (error) {
    console.error("POST /api/simulate failed:", error);
    return jsonError("Internal error", 500);
  }
}
