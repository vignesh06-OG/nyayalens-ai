// NyayaLens AI — streaming tests: the real-AI code paths (key present) and
// the no-key default branch. The AI SDK is mocked at the module boundary; the
// no-network fallback paths live in streaming.test.ts.
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

  it("streams negotiation with the skeleton embedded in the prompt", async () => {
    saveContract(CONTRACT);
    streamTextMock.mockReturnValue({ toTextStreamResponse: () => new Response("rounds...") });
    const res = await streamCompletion({
      mode: "negotiate",
      prompt: "Reduce the deposit to one month",
      contractId: "c-1",
    });
    await res.text();
    const args = streamTextMock.mock.calls[0]?.[0] as { model: string; prompt: string; system: string };
    expect(args.model).toBe("openai:gpt-4o");
    expect(args.prompt).toContain("Negotiation skeleton");
    expect(args.system).toContain("RERA § 13");
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

describe("streamCompletion (remaining AI paths with a key)", () => {
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

  it("streams simulation cards through the AI for a registered contract", async () => {
    saveContract(CONTRACT);
    streamTextMock.mockReturnValue({ toTextStreamResponse: () => new Response("cards") });
    const res = await streamCompletion({ mode: "simulate", prompt: "Early termination", contractId: "c-1" });
    await res.text();
    const args = streamTextMock.mock.calls[0]?.[0] as { model: string };
    expect(args.model).toBe("openai:gpt-4o");
    expect(res.headers.get("x-nyayalens-degraded")).toBeNull();
  });

  it("streams the compare narrative through the AI with both documents in the prompt", async () => {
    streamTextMock.mockReturnValue({ toTextStreamResponse: () => new Response("compare") });
    const res = await streamCompletion({
      mode: "compare",
      prompt: DOC,
      docB: `${DOC}\n\n3. Arbitration in Nashik.`,
    });
    await res.text();
    const args = streamTextMock.mock.calls[0]?.[0] as { model: string; prompt: string };
    expect(args.model).toBe("openai:gpt-4o");
    expect(args.prompt).toContain("Arbitration in Nashik");
  });

  it("streams the email draft through the AI with the mini model", async () => {
    streamTextMock.mockReturnValue({ toTextStreamResponse: () => new Response("email") });
    const res = await streamCompletion({ mode: "email", prompt: DOC });
    await res.text();
    const args = streamTextMock.mock.calls[0]?.[0] as { model: string };
    expect(args.model).toBe("openai:gpt-4o-mini");
  });
});

describe("simulateWithAiStream failure", () => {
  it("returns null when streamText throws immediately despite a key", async () => {
    const saved = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key";
    streamTextMock.mockReset();
    streamTextMock.mockImplementation(() => {
      throw new Error("stream down");
    });
    try {
      expect(await simulateWithAiStream(CONTRACT, "Early termination")).toBeNull();
    } finally {
      if (saved === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = saved;
      }
    }
  });
});
