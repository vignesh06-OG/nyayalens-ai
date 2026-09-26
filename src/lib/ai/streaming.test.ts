import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const streamTextMock = vi.fn();

vi.mock("ai", () => ({
  streamText: (args: unknown) => streamTextMock(args),
  generateObject: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: (model: string) => `openai:${model}`,
}));

import { saveContract } from "@/lib/contractStore";
import { simulateWithAiStream, streamCompletion } from "@/lib/ai/streaming";
import { NEGOTIATION_MARKERS } from "@/lib/ai/prompts";
import type { Contract, LegalProvision } from "@/domain/simulation/types";

const DOC =
  "1. Payment. The Tenant shall pay Rs 25,000 on the 5th of each month.\n\n2. Deposit. The security deposit of three months may be forfeited at the sole discretion of the Landlord.";

const PROVISIONS: LegalProvision[] = [
  { id: "p1", reference: "2", text: "The security deposit of three months may be forfeited.", topic: "payment" },
];

const CONTRACT: Contract = {
  id: "c-1",
  title: "Flat Rental Agreement",
  kind: "rental",
  text: DOC,
  provisions: PROVISIONS,
};

async function readAll(res: Response): Promise<string> {
  return await res.text();
}

describe("simulateWithAiStream", () => {
  it("returns null without a key", async () => {
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
  });

  afterEach(() => {
    if (savedKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = savedKey;
    }
  });

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

  it("streams the deterministic negotiation narrative with all markers", async () => {
    saveContract(CONTRACT);
    const res = await streamCompletion({
      mode: "negotiate",
      prompt: "Reduce the deposit to one month",
      contractId: "c-1",
    });
    expect(res.headers.get("x-nyayalens-degraded")).toBe("1");
    const text = await readAll(res);
    expect(text).toContain(NEGOTIATION_MARKERS.rounds);
    expect(text).toContain(NEGOTIATION_MARKERS.redline);
    expect(text).toContain(NEGOTIATION_MARKERS.verdict);
    expect(text).toContain("Round 3 — convergence 85/100");
    expect(text).toContain("RERA § 13");
    // The word-by-word rule stream over a full 3-round narrative is slow by design.
  }, 30_000);

  it("throws when negotiate mode has no registered contract", async () => {
    await expect(
      streamCompletion({ mode: "negotiate", prompt: "Reduce the deposit", contractId: "ghost" }),
    ).rejects.toThrow(/contractId/);
  });
});
