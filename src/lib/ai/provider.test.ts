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
  simulateWithAiStream,
  streamCompletion,
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
  beforeEach(() => generateObjectMock.mockReset());
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
  beforeEach(() => generateObjectMock.mockReset());
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
  beforeEach(() => generateObjectMock.mockReset());
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

describe("runRuleSimulation / simulateWithAiStream", () => {
  it("produces a deterministic structured simulation", () => {
    const outcome = runRuleSimulation(CONTRACT, "Non-payment of the rent");
    expect(outcome.result.summary).toMatch(/provision/i);
    expect(outcome.consequences.length).toBeGreaterThan(0);
    expect(outcome.consequences[0]?.probability.value).toBeGreaterThanOrEqual(0);
  });

  it("returns null from simulateWithAiStream without a key", async () => {
    const saved = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    await expect(simulateWithAiStream(CONTRACT, "Early termination")).resolves.toBeNull();
    if (saved !== undefined) {
      process.env.OPENAI_API_KEY = saved;
    }
  });

  it("streams via streamText with a key present", async () => {
    const saved = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key";
    streamTextMock.mockReturnValue({ toDataStreamResponse: () => new Response("stream") });
    const res = await simulateWithAiStream(CONTRACT, "Early termination");
    expect(res).not.toBeNull();
    expect(streamTextMock).toHaveBeenCalledTimes(1);
    if (saved === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = saved;
    }
  });
});

describe("streamCompletion (rule fallback path — no API key)", () => {
  const savedKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    streamTextMock.mockReset();
    generateObjectMock.mockReset();
  });

  afterEach(() => {
    if (savedKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = savedKey;
    }
  });

  async function readAll(res: Response): Promise<string> {
    return await res.text();
  }

  it("streams an analysis narrative with both perspective markers", async () => {
    const res = await streamCompletion({ mode: "analysis", prompt: DOC, documentType: "rental" });
    expect(res.status).toBe(200);
    expect(res.headers.get("x-nyayalens-degraded")).toBe("1");
    const text = await readAll(res);
    expect(text).toContain("AI analysis temporarily unavailable. Showing rule-based assessment.");
    expect(text).toContain("PARTY A PERSPECTIVE:");
    expect(text).toContain("PARTY B PERSPECTIVE:");
  });

  it("streams simulation cards for a registered contract", async () => {
    const { saveContract } = await import("@/lib/contractStore");
    saveContract(CONTRACT);
    const res = await streamCompletion({ mode: "simulate", prompt: "Early termination", contractId: "c-1" });
    const text = await readAll(res);
    expect(text).toContain("⚠️ Consequences:");
    expect(text).toContain("📜 Relevant Law:");
    expect(text).toContain("🎯 Recommended Action:");
    expect(text).toContain("📊 Risk Score:");
  });

  it("throws for an unknown contractId", async () => {
    await expect(
      streamCompletion({ mode: "simulate", prompt: "Non-payment", contractId: "ghost" }),
    ).rejects.toThrow(/contractId/);
  });

  it("throws when simulate mode omits contractId entirely", async () => {
    await expect(streamCompletion({ mode: "simulate", prompt: "Early termination" })).rejects.toThrow(
      /contractId/,
    );
  });

  it("streams a simplified version with the degraded note", async () => {
    const res = await streamCompletion({ mode: "simplify", prompt: DOC, targetLevel: 6, language: "en" });
    const text = await readAll(res);
    expect(text).toContain("AI analysis temporarily unavailable");
    expect(text.length).toBeGreaterThan(40);
  });

  it("mentions the Hindi limitation in the degraded note for hi", async () => {
    const res = await streamCompletion({ mode: "simplify", prompt: DOC, targetLevel: 8, language: "hi" });
    const text = await readAll(res);
    expect(text.toLowerCase()).toContain("hindi");
  });

  it("streams a compare narrative", async () => {
    const res = await streamCompletion({
      mode: "compare",
      prompt: DOC,
      docB: `${DOC}\n\n3. Arbitration in Nashik.`,
    });
    const text = await readAll(res);
    expect(text).toContain("AI analysis temporarily unavailable");
  });

  it("streams an email draft with a subject line", async () => {
    const res = await streamCompletion({ mode: "email", prompt: DOC, documentType: "rental" });
    const text = await readAll(res);
    expect(text).toContain("Subject:");
  });
});

describe("streamCompletion (AI path with a key)", () => {
  const savedKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-key";
    streamTextMock.mockReset();
  });

  afterEach(() => {
    if (savedKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = savedKey;
    }
  });

  it("delegates to streamText with gpt-4o for analysis", async () => {
    streamTextMock.mockReturnValue({
      toTextStreamResponse: () =>
        new Response("PARTY A PERSPECTIVE: x PARTY B PERSPECTIVE: y", {
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
    });
    const res = await streamCompletion({ mode: "analysis", prompt: DOC, documentType: "rental" });
    expect(streamTextMock).toHaveBeenCalledTimes(1);
    const args = streamTextMock.mock.calls[0]?.[0] as { model: string };
    expect(args.model).toBe("openai:gpt-4o");
    expect(res.headers.get("x-nyayalens-degraded")).toBeNull();
    await res.text();
  });

  it("uses gpt-4o-mini for simplification", async () => {
    streamTextMock.mockReturnValue({ toTextStreamResponse: () => new Response("simplified words") });
    const res = await streamCompletion({ mode: "simplify", prompt: DOC, targetLevel: 8, language: "en" });
    await res.text();
    const args = streamTextMock.mock.calls[0]?.[0] as { model: string };
    expect(args.model).toBe("openai:gpt-4o-mini");
  });

  it("rethrows when the AI stream itself fails", async () => {
    streamTextMock.mockImplementation(() => {
      throw new Error("stream down");
    });
    await expect(streamCompletion({ mode: "email", prompt: DOC })).rejects.toThrow("stream down");
  });
});

describe("streamCompletion defaults", () => {
  const savedKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    if (savedKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = savedKey;
    }
  });

  it("defaults documentType, targetLevel, language, and docB when omitted", async () => {
    const analysis = await streamCompletion({ mode: "analysis", prompt: DOC });
    expect(analysis.headers.get("x-nyayalens-degraded")).toBe("1");
    await analysis.text();

    const simplify = await streamCompletion({ mode: "simplify", prompt: DOC });
    await simplify.text();

    const compare = await streamCompletion({ mode: "compare", prompt: DOC });
    const compareText = await compare.text();
    expect(compareText.length).toBeGreaterThan(20);

    const email = await streamCompletion({ mode: "email", prompt: DOC });
    await email.text();
  }, 25_000);
});
