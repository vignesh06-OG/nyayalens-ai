import { describe, expect, it } from "vitest";

import { FALLBACK_MESSAGE, fallbackAnalyze, fallbackSimplify } from "@/lib/ai/fallback";

const doc = `Residential Lease.

1. The Tenant shall pay Rs 25,000 on the 5th.

2. The deposit may be forfeited at the sole discretion of the Landlord.

3. Either party may terminate with 30 days notice.`;

describe("fallbackAnalyze", () => {
  it("returns segmented clauses alongside the analysis result", () => {
    const { clauses, result } = fallbackAnalyze(doc, "rental");
    expect(clauses.length).toBeGreaterThan(0);
    expect(result.clauses.length).toBe(clauses.length);
    expect(result.assessments.length).toBe(clauses.length);
  });

  it("produces a bounded risk score and a full heatmap", () => {
    const { result } = fallbackAnalyze(doc, "rental");
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
    expect(result.heatmap.cells.length).toBe(result.clauses.length * 6);
  });
});

describe("fallbackSimplify", () => {
  it("simplifies legalese and reports replacements", () => {
    const out = fallbackSimplify("The parties hereto agree to indemnify and hold harmless.", 8);
    expect(out.simplified.length).toBeGreaterThan(0);
    expect(out.targetLevel).toBe(8);
    expect(Array.isArray(out.replacements)).toBe(true);
  });
});

describe("fallbackAnalyze per contract kind", () => {
  const texts: Record<string, string> = {
    rental: "The tenant shall pay rent and the deposit may be forfeited on termination.",
    employment: "The employee shall keep confidential all trade secrets and the salary is payable monthly.",
    nda: "The receiving party shall keep confidential the proprietary information forever.",
    tos: "The service may terminate the account at its sole discretion without notice.",
    other: "The parties agree to nothing in particular here.",
  };

  it("produces template-enriched drivers for every contract kind", () => {
    for (const [kind, text] of Object.entries(texts)) {
      const { result } = fallbackAnalyze(text, kind as "rental");
      expect(result.assessments.length).toBeGreaterThan(0);
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    }
  });

  it("takes the no-template-hit path for plain text", () => {
    const { result } = fallbackAnalyze("Blue skies today.", "other");
    expect(result.assessments.length).toBeGreaterThan(0);
  });
});

describe("re-exports", () => {
  it("re-exports buildComplianceChecklist for route use", async () => {
    const mod = await import("@/lib/ai/fallback");
    expect(typeof mod.buildComplianceChecklist).toBe("function");
    const { result } = fallbackAnalyze(doc, "rental");
    expect(Array.isArray(mod.buildComplianceChecklist(result))).toBe(true);
  });
});

describe("FALLBACK_MESSAGE", () => {
  it("matches the mandated string exactly", () => {
    expect(FALLBACK_MESSAGE).toBe(
      "AI analysis temporarily unavailable. Showing rule-based assessment.",
    );
  });
});
