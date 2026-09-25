import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateObjectMock = vi.fn();

vi.mock("ai", () => ({
  generateObject: (args: unknown) => generateObjectMock(args),
  streamText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: (model: string) => `openai:${model}`,
}));

import { runNegotiation } from "@/domain/negotiation/engine";
import type { Contract } from "@/domain/simulation/types";
import { FALLBACK_MESSAGE } from "@/lib/ai/fallback";
import { mergeAiNegotiation, negotiateContract } from "@/lib/ai/negotiation";
import { AiNegotiationOutputSchema } from "@/lib/validation/schema";

const CONTRACT: Contract = {
  id: "c-neg",
  title: "Flat Rental Agreement",
  kind: "rental",
  text: "1. Deposit. The security deposit of three months may be forfeited at the sole discretion of the Landlord.",
  provisions: [
    { id: "p1", reference: "1", text: "The security deposit of three months may be forfeited.", topic: "payment" },
  ],
};

const GOAL = "Reduce the deposit to one month";

const AI_OUTPUT = AiNegotiationOutputSchema.parse({
  rounds: [
    { partyAPosition: "A1 ai", partyBPosition: "B1 ai", mediatorGap: "gap1 ai", mediatorSuggestion: "bridge1 ai" },
    { partyAPosition: "A2 ai", partyBPosition: "B2 ai", mediatorGap: "gap2 ai", mediatorSuggestion: "bridge2 ai" },
    { partyAPosition: "A3 ai", partyBPosition: "B3 ai", mediatorGap: "gap3 ai", mediatorSuggestion: "bridge3 ai" },
  ],
  finalSummary: "Settled at two months with a 30-day refund window.",
});

describe("mergeAiNegotiation", () => {
  it("overlays AI text while keeping citations, stances, and convergence rule-pinned", () => {
    const rule = runNegotiation(CONTRACT, GOAL);
    const merged = mergeAiNegotiation(rule, AI_OUTPUT);

    expect(merged.rounds[0]?.partyA.position).toBe("A1 ai");
    expect(merged.rounds[2]?.mediator.suggestion).toBe("bridge3 ai");

    // Rule-derived spine untouched:
    expect(merged.rounds.map((r) => r.mediator.convergence)).toEqual([30, 60, 85]);
    expect(merged.rounds[0]?.partyA.stance).toBe(rule.rounds[0]?.partyA.stance);
    expect(merged.rounds[0]?.partyB.citations).toEqual(rule.rounds[0]?.partyB.citations);
    expect(merged.finalRedlines).toEqual(rule.finalRedlines);
    expect(merged.agreementScore).toBe(rule.agreementScore);
  });

  it("appends the statutory basis and disclaimer by rule, never by model", () => {
    const rule = runNegotiation(CONTRACT, GOAL);
    const merged = mergeAiNegotiation(rule, AI_OUTPUT);
    expect(merged.finalSummary).toContain(AI_OUTPUT.finalSummary);
    expect(merged.finalSummary).toContain("Statutory basis:");
    expect(merged.finalSummary).toContain("Not legal advice");
  });
});

describe("negotiateContract", () => {
  beforeEach(() => generateObjectMock.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it("returns the AI-voiced negotiation without degrading on the happy path", async () => {
    generateObjectMock.mockResolvedValue({ object: AI_OUTPUT });
    const outcome = await negotiateContract(CONTRACT, GOAL);
    expect(outcome.degraded).toBe(false);
    expect(outcome.message).toBeNull();
    expect(outcome.result.rounds).toHaveLength(3);
    expect(outcome.result.rounds[1]?.partyB.position).toBe("B2 ai");
    expect(outcome.result.statutoryBasis).toContain("RERA § 13");
  });

  it("calls gpt-4o with an abort signal and the negotiation schema", async () => {
    generateObjectMock.mockResolvedValue({ object: AI_OUTPUT });
    await negotiateContract(CONTRACT, GOAL);
    const args = generateObjectMock.mock.calls[0]?.[0] as {
      model: string;
      abortSignal: AbortSignal;
    };
    expect(args.model).toBe("openai:gpt-4o");
    expect(args.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it("falls back to the deterministic engine with the exact message when the AI throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    generateObjectMock.mockResolvedValue({ object: null });
    const outcome = await negotiateContract(CONTRACT, GOAL);
    expect(outcome.degraded).toBe(true);
    expect(outcome.message).toBe(FALLBACK_MESSAGE);
    expect(outcome.result).toEqual(runNegotiation(CONTRACT, GOAL));
  });
});
