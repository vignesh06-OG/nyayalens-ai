import { describe, expect, it } from "vitest";

import { checkRateLimit, clientKey } from "@/lib/security/rateLimit";

describe("checkRateLimit", () => {
  it("allows the first 100 requests in a minute", () => {
    const key = "rl-1";
    for (let i = 0; i < 100; i += 1) {
      expect(checkRateLimit(key, 1_000_000).allowed).toBe(true);
    }
  });

  it("blocks request 101 with a positive retry hint", () => {
    const key = "rl-2";
    for (let i = 0; i < 100; i += 1) {
      checkRateLimit(key, 2_000_000);
    }
    const decision = checkRateLimit(key, 2_000_000);
    expect(decision.allowed).toBe(false);
    expect(decision.remaining).toBe(0);
    expect(decision.retryAfterSeconds).toBeGreaterThan(0);
    expect(decision.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("slides the window open after a minute", () => {
    const key = "rl-3";
    for (let i = 0; i < 100; i += 1) {
      checkRateLimit(key, 3_000_000);
    }
    expect(checkRateLimit(key, 3_000_000).allowed).toBe(false);
    expect(checkRateLimit(key, 3_000_000 + 61_000).allowed).toBe(true);
  });

  it("isolates keys from each other", () => {
    for (let i = 0; i < 100; i += 1) {
      checkRateLimit("rl-4a", 4_000_000);
    }
    expect(checkRateLimit("rl-4a", 4_000_000).allowed).toBe(false);
    expect(checkRateLimit("rl-4b", 4_000_000).allowed).toBe(true);
  });
});

describe("clientKey", () => {
  it("prefers x-forwarded-for when present", () => {
    const req = new Request("http://x.test", { headers: { "x-forwarded-for": "10.1.2.3, 1.1.1.1" } });
    expect(clientKey(req)).toContain("10.1.2.3");
  });

  it("falls back to a shared key without addressing hints", () => {
    const req = new Request("http://x.test");
    expect(clientKey(req).length).toBeGreaterThan(0);
  });
});

describe("tracking-cap pruning", () => {
  it("prunes stale keys beyond the tracking cap without throwing", () => {
    for (let i = 0; i < 2_100; i += 1) {
      checkRateLimit(`prune-${i}`, 5_000_000);
    }
    const decision = checkRateLimit("prune-trigger", 5_000_000 + 120_000);
    expect(decision.allowed).toBe(true);
    expect(checkRateLimit("prune-0", 5_000_000 + 120_000).allowed).toBe(true);
  });
});
