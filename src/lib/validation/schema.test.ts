import { describe, expect, it } from "vitest";

import {
  AnalyzeInputSchema,
  COMPLETION_MODES,
  CompareInputSchema,
  SimulateInputSchema,
  SimplifyInputSchema,
  StreamRequestSchema,
  formatZodError,
  promptFromStreamRequest,
} from "@/lib/validation/schema";

describe("input schemas", () => {
  it("AnalyzeInputSchema accepts a real document", () => {
    const parsed = AnalyzeInputSchema.safeParse({
      documentText: "The tenant shall pay rent monthly.",
      documentType: "rental",
    });
    expect(parsed.success).toBe(true);
  });

  it("AnalyzeInputSchema rejects text under 10 characters", () => {
    const parsed = AnalyzeInputSchema.safeParse({ documentText: "short", documentType: "nda" });
    expect(parsed.success).toBe(false);
  });

  it("SimulateInputSchema requires a contract id and scenario", () => {
    expect(
      SimulateInputSchema.safeParse({ contractId: "c-1", scenario: "What if the tenant stops paying?" }).success,
    ).toBe(true);
    expect(SimulateInputSchema.safeParse({ scenario: "What if the tenant stops paying?" }).success).toBe(false);
    expect(SimulateInputSchema.safeParse({ contractId: "c-1", scenario: "tiny" }).success).toBe(false);
  });

  it("SimplifyInputSchema bounds targetLevel to 4–12 and requires text", () => {
    const base = { text: "Legalese hereinbefore contained." };
    expect(SimplifyInputSchema.safeParse({ ...base, targetLevel: 8 }).success).toBe(true);
    expect(SimplifyInputSchema.safeParse({ ...base, targetLevel: 3 }).success).toBe(false);
    expect(SimplifyInputSchema.safeParse({ ...base, targetLevel: 13 }).success).toBe(false);
    expect(SimplifyInputSchema.safeParse({ text: "short", targetLevel: 8 }).success).toBe(false);
  });

  it("CompareInputSchema requires both documents", () => {
    expect(CompareInputSchema.safeParse({ docA: "a".repeat(12), docB: "b".repeat(12) }).success).toBe(true);
    expect(CompareInputSchema.safeParse({ docA: "a".repeat(12) }).success).toBe(false);
  });
});

describe("StreamRequestSchema", () => {
  it("accepts the useCompletion wire shape", () => {
    const parsed = StreamRequestSchema.safeParse({ prompt: "analyse this clause", mode: "analysis" });
    expect(parsed.success).toBe(true);
  });

  it("accepts the useChat wire shape with extras", () => {
    const parsed = StreamRequestSchema.safeParse({
      messages: [{ role: "user", content: "Early termination" }],
      mode: "simulate",
      contractId: "c-9",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown mode", () => {
    expect(StreamRequestSchema.safeParse({ prompt: "hello there", mode: "bogus" }).success).toBe(false);
  });

  it("rejects a body with neither prompt nor messages", () => {
    expect(StreamRequestSchema.safeParse({ mode: "email" }).success).toBe(false);
  });

  it("lists exactly five completion modes", () => {
    expect(COMPLETION_MODES).toHaveLength(5);
    expect([...COMPLETION_MODES]).toEqual(["analysis", "simulate", "simplify", "compare", "email"]);
  });
});

describe("promptFromStreamRequest", () => {
  it("passes prompt through", () => {
    const parsed = StreamRequestSchema.parse({ prompt: "clause text here", mode: "email" });
    expect(promptFromStreamRequest(parsed)).toBe("clause text here");
  });

  it("extracts the latest user message from a chat transcript", () => {
    const parsed = StreamRequestSchema.parse({
      messages: [
        { role: "user", content: "first" },
        { role: "assistant", content: "reply" },
        { role: "user", content: "second" },
      ],
      mode: "simulate",
    });
    expect(promptFromStreamRequest(parsed)).toBe("second");
  });

  it("returns empty string when no user message exists", () => {
    const parsed = StreamRequestSchema.parse({
      messages: [{ role: "assistant", content: "only assistant" }],
      mode: "simulate",
    });
    expect(promptFromStreamRequest(parsed)).toBe("");
  });
});

describe("formatZodError", () => {
  it("produces a readable message", () => {
    const parsed = AnalyzeInputSchema.safeParse({});
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const message = formatZodError(parsed.error);
      expect(message.length).toBeGreaterThan(0);
      expect(typeof message).toBe("string");
    }
  });

  it("falls back to a generic message for an empty error list", () => {
    expect(formatZodError({ issues: [] } as unknown as import("zod").ZodError)).toBe("Invalid input");
  });
});
