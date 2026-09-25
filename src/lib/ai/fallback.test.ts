import { describe, expect, it } from "vitest";

import {
  FALLBACK_MESSAGE,
  composeAnalysisNarrative,
  composeCompareNarrative,
  composeEmailDraft,
  composeSimulationCards,
  fallbackAnalyze,
  fallbackSimplify,
} from "@/lib/ai/fallback";
import { ANALYSIS_MARKERS, SIM_CARD_MARKERS } from "@/lib/ai/prompts";
import type { Document } from "@/domain/comparison/types";
import type { AnalysisResult } from "@/domain/analysis/types";

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

describe("composers", () => {
  const { result } = fallbackAnalyze(doc, "rental");

  it("composeAnalysisNarrative handles a low-risk-only analysis", () => {
    const calm: AnalysisResult = {
      clauses: [{ id: "x", reference: "9", title: "Fluff", text: "Nice words." }],
      assessments: [
        {
          clauseId: "ghost-clause",
          riskLevel: "high",
          score: 80,
          drivers: [],
          dimensionScores: { ambiguity: 0, liability: 0, termination: 0, payment: 0, confidentiality: 0, renewal: 0 },
        },
      ],
      heatmap: { clauseIds: ["x"], dimensions: [], cells: [] },
      obligations: [],
      riskScore: 5,
    };
    const text = composeAnalysisNarrative(calm);
    expect(text).toContain(ANALYSIS_MARKERS.partyA);
    expect(text).toContain("ghost-clause");
  });

  it("composeAnalysisNarrative emits the fallback preamble and both markers", () => {
    const text = composeAnalysisNarrative(result);
    expect(text).toContain(FALLBACK_MESSAGE);
    expect(text).toContain(ANALYSIS_MARKERS.partyA);
    expect(text).toContain(ANALYSIS_MARKERS.partyB);
  });

  it("composeSimulationCards emits all four card markers and an NN/100 score", () => {
    const text = composeSimulationCards(
      { id: "c", title: "Lease", kind: "rental", text: doc, provisions: [] },
      "Early termination",
    );
    expect(text).toContain(SIM_CARD_MARKERS.consequences);
    expect(text).toContain(SIM_CARD_MARKERS.law);
    expect(text).toContain(SIM_CARD_MARKERS.action);
    expect(text).toContain(SIM_CARD_MARKERS.score);
    expect(/\d{1,3}\s*\/\s*100/.test(text)).toBe(true);
    expect(text).toContain(FALLBACK_MESSAGE);
  });

  it("composeSimulationCards works across every scenario kind", () => {
    const scenarios = ["breach of duty", "early termination", "non-payment of rent", "a dispute in court", "renewal terms"];
    for (const scenario of scenarios) {
      const text = composeSimulationCards(
        { id: "c", title: "Lease", kind: "rental", text: doc, provisions: [] },
        scenario,
      );
      expect(text).toContain(SIM_CARD_MARKERS.score);
    }
  });

  it("composeCompareNarrative summarises the versions", () => {
    const base: Document = { id: "A", title: "A", kind: "other", text: doc };
    const target: Document = {
      id: "B",
      title: "B",
      kind: "other",
      text: `${doc}\n\n4. New unlimited liability clause.`,
    };
    const text = composeCompareNarrative(base, target);
    expect(text).toContain(FALLBACK_MESSAGE);
    expect(text.length).toBeGreaterThan(60);
  });

  it("composeCompareNarrative handles empty and stopword-only documents", () => {
    const empty: Document = { id: "E", title: "", kind: "other", text: "" };
    const stopwords: Document = { id: "S", title: "S", kind: "other", text: "the and for that this with" };
    expect(composeCompareNarrative(empty, empty).length).toBeGreaterThan(20);
    expect(composeCompareNarrative(stopwords, empty).length).toBeGreaterThan(20);
    expect(composeCompareNarrative(empty, stopwords).length).toBeGreaterThan(20);
  });

  it("composeEmailDraft degrades gracefully with an empty analysis", () => {
    const empty: AnalysisResult = {
      clauses: [],
      assessments: [],
      heatmap: { clauseIds: [], dimensions: [], cells: [] },
      obligations: [],
      riskScore: 0,
    };
    const text = composeEmailDraft(empty);
    expect(text).toContain("Subject:");
  });

  it("composeEmailDraft produces a subject line and sign-off", () => {
    const text = composeEmailDraft(result);
    expect(text).toContain("Subject:");
    expect(text.toLowerCase()).toContain("regards");
  });

  it("re-exports buildComplianceChecklist for route use", async () => {
    const mod = await import("@/lib/ai/fallback");
    expect(typeof mod.buildComplianceChecklist).toBe("function");
    const items = mod.buildComplianceChecklist(result);
    expect(Array.isArray(items)).toBe(true);
  });
});

describe("FALLBACK_MESSAGE", () => {
  it("matches the mandated string exactly", () => {
    expect(FALLBACK_MESSAGE).toBe(
      "AI analysis temporarily unavailable. Showing rule-based assessment.",
    );
  });
});
