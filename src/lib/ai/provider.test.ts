import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const streamTextMock = vi.fn();
const generateObjectMock = vi.fn();

vi.mock("ai", () => ({
  streamText: (args: unknown) => streamTextMock(args),
  generateObject: (args: unknown) => generateObjectMock(args),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: (model: string) => `openai:${model}`,
}));

import {
  analyzeDocument,
  compareDocuments,
  runRuleSimulation,
  simplifyDocument,
} from "@/lib/ai/provider";
import { AiAnalysisOutputSchema, type AiAnalysisOutput } from "@/lib/validation/schema";
import { FALLBACK_MESSAGE } from "@/lib/ai/fallback";
import type { Contract, LegalProvision } from "@/domain/simulation/types";

const DOC =
  "1. Payment. The Tenant shall pay Rs 25,000 on the 5th of each month.\n\n2. Deposit. The security deposit may be forfeited at the sole discretion of the Landlord.";

const AI_ANALYSIS: AiAnalysisOutput = AiAnalysisOutputSchema.parse({
  clauses: [
    {
      reference: "Clause 1",
      title: "Payment",
      summary: "Rent duty on the 5th",
      riskLevel: "high",
      score: 78,
      drivers: ["One-sided forfeiture language"],
      obligations: [{ party: "party-a", action: "Pay Rs 25,000 monthly", trigger: null, deadline: "by the 5th" }],
    },
    {
      reference: "Clause 2",
      title: "Deposit",
      summary: "Forfeitable deposit",
      riskLevel: "medium",
      score: 55,
      drivers: ["Discretionary forfeiture"],
      obligations: [],
    },
  ],
});

const PROVISIONS: LegalProvision[] = [
  { id: "p1", reference: "1", text: "Rent of Rs 25,000 is due on the 5th of each month.", topic: "payment" },
];

const CONTRACT: Contract = {
  id: "c-1",
  title: "Flat Rental Agreement",
  kind: "rental",
  text: DOC,
  provisions: PROVISIONS,
};

describe("analyzeDocument", () => {
  beforeEach(() => {
    generateObjectMock.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it("merges AI insights on the happy path without degrading", async () => {
    generateObjectMock.mockResolvedValue({ object: AI_ANALYSIS });
    const outcome = await analyzeDocument({ documentText: DOC, documentType: "rental" });
    expect(outcome.degraded).toBe(false);
    expect(outcome.message).toBeNull();
    expect(outcome.result.clauses).toHaveLength(2);
    expect(outcome.result.obligations.length).toBeGreaterThan(0);
  });

  it("keeps the rule assessment for clauses the AI did not cover", async () => {
    const sparse = AiAnalysisOutputSchema.parse({
      clauses: [
        {
          reference: "Clause 1",
          title: "Payment",
          summary: "Rent duty",
          riskLevel: "low",
          score: 12,
          drivers: [],
          obligations: [{ party: "both", action: "Review annually", trigger: "each year", deadline: null }],
        },
      ],
    });
    generateObjectMock.mockResolvedValue({ object: sparse });
    const outcome = await analyzeDocument({ documentText: DOC, documentType: "rental" });
    expect(outcome.result.assessments).toHaveLength(2);
    expect(outcome.result.obligations.some((o) => o.action === "Review annually")).toBe(true);
  });

  it("falls back to rules with the exact message when the AI throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    generateObjectMock.mockResolvedValue({ object: null });
    const outcome = await analyzeDocument({ documentText: DOC, documentType: "rental" });
    expect(outcome.degraded).toBe(true);
    expect(outcome.message).toBe(FALLBACK_MESSAGE);
    expect(outcome.result.assessments.length).toBeGreaterThan(0);
  });
});

describe("simplifyDocument", () => {
  beforeEach(() => {
    generateObjectMock.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns the AI rewrite with an estimated grade", async () => {
    generateObjectMock.mockResolvedValue({ object: { simplified: "You must pay rent every month." } });
    const outcome = await simplifyDocument({ text: "The Tenant shall pay rent monthly.", targetLevel: 8 });
    expect(outcome.degraded).toBe(false);
    expect(outcome.simplified.simplified).toContain("must pay rent");
    expect(outcome.simplified.replacements).toEqual([]);
    expect(outcome.simplified.targetLevel).toBe(8);
  });

  it("falls back to the dictionary when the AI throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    generateObjectMock.mockResolvedValue({ object: null });
    const outcome = await simplifyDocument({ text: "in accordance with the terms herein", targetLevel: 8 });
    expect(outcome.degraded).toBe(true);
    expect(outcome.message).toBe(FALLBACK_MESSAGE);
    expect(outcome.simplified.simplified.length).toBeGreaterThan(0);
  });
});

describe("compareDocuments", () => {
  beforeEach(() => {
    generateObjectMock.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it("keeps the domain diff and overlays AI materiality", async () => {
    generateObjectMock.mockResolvedValue({ object: { summary: "Risk moved toward the landlord.", materiality: ["Deposit now forfeitable"] } });
    const base = { id: "A", title: "Base", kind: "rental" as const, text: DOC };
    const target = { id: "B", title: "Target", kind: "rental" as const, text: `${DOC}\n\n3. Arbitration. All disputes go to arbitration.` };
    const outcome = await compareDocuments(base, target);
    expect(outcome.degraded).toBe(false);
    expect(outcome.summary).toBe("Risk moved toward the landlord.");
    expect(outcome.materiality).toEqual(["Deposit now forfeitable"]);
    expect(outcome.diff.addedCount).toBe(1);
  });

  it("falls back to the rule summary when the AI throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    generateObjectMock.mockResolvedValue({ object: null });
    const base = { id: "A", title: "Base", kind: "rental" as const, text: DOC };
    const outcome = await compareDocuments(base, base);
    expect(outcome.degraded).toBe(true);
    expect(outcome.message).toBe(FALLBACK_MESSAGE);
    expect(outcome.summary).toMatch(/added/);
  });
});

describe("runRuleSimulation", () => {
  it("produces a deterministic structured simulation", () => {
    const outcome = runRuleSimulation(CONTRACT, "Non-payment of the rent");
    expect(outcome.result.summary).toMatch(/provision/i);
    expect(outcome.consequences.length).toBeGreaterThan(0);
    expect(outcome.consequences[0]?.probability.value).toBeGreaterThanOrEqual(0);
  });
});

describe("analyzeDocument obligation fallback", () => {
  beforeEach(() => {
    generateObjectMock.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it("re-extracts obligations with rules when the AI returns none", async () => {
    generateObjectMock.mockResolvedValue({
      object: { clauses: AI_ANALYSIS.clauses.map((c) => ({ ...c, obligations: [] })) },
    });
    const outcome = await analyzeDocument({ documentText: DOC, documentType: "rental" });
    expect(outcome.degraded).toBe(false);
    expect(outcome.result.obligations.length).toBeGreaterThan(0);
  });
});

describe("compareDocuments AI failure", () => {
  beforeEach(() => {
    generateObjectMock.mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns the rule diff with a degraded flag when the AI rejects", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    generateObjectMock.mockImplementation(() => {
      throw new Error("boom");
    });
    const base = { id: "A", title: "Base", kind: "rental" as const, text: DOC };
    const target = { id: "B", title: "Target", kind: "rental" as const, text: `${DOC}\n\n3. Arbitration in Nashik.` };
    const outcome = await compareDocuments(base, target);
    expect(outcome.degraded).toBe(true);
    expect(outcome.message).toBe(FALLBACK_MESSAGE);
    expect(outcome.diff.diffs.length).toBeGreaterThan(0);
    expect(outcome.materiality.length).toBeGreaterThan(0);
  });
});
