import { describe, expect, it } from "vitest";

import { analyzeClauses, segmentClauses } from "@/domain/analysis/engine";
import type { AnalysisResult } from "@/domain/analysis/types";
import type { Document } from "@/domain/comparison/types";
import type { Contract as SimContract } from "@/domain/simulation/types";
import { runNegotiation } from "@/domain/negotiation/engine";
import { FALLBACK_MESSAGE, fallbackAnalyze } from "@/lib/ai/fallback";
import {
  composeAnalysisNarrative,
  composeCompareNarrative,
  composeEmailDraft,
  composeNegotiationNarrative,
  composeSimulationCards,
} from "@/lib/ai/narratives";
import { ANALYSIS_MARKERS, NEGOTIATION_MARKERS, SIM_CARD_MARKERS } from "@/lib/ai/prompts";

const doc = `Residential Lease.

1. The Tenant shall pay Rs 25,000 on the 5th.

2. The deposit may be forfeited at the sole discretion of the Landlord.

3. Either party may terminate with 30 days notice.`;

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

  it("composeSimulationCards cites statutes from the canonical legal DB", () => {
    const text = composeSimulationCards(
      { id: "c", title: "Lease", kind: "rental", text: doc, provisions: [] },
      "Early termination of the lease",
    );
    // Termination kind maps to ICA 39 / ICA 62 / TPA 108 through the DB.
    expect(text).toContain("ICA § 39");
    expect(text).toContain("TPA § 108");
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
});

describe("composeNegotiationNarrative", () => {
  const contract = { id: "c", title: "Lease", kind: "rental" as const, text: doc, provisions: [] };

  it("emits all three markers, three rounds, and statute citations", () => {
    const result = runNegotiation(contract, "Reduce the deposit to one month");
    const text = composeNegotiationNarrative(result, contract.title);
    expect(text).toContain(FALLBACK_MESSAGE);
    expect(text).toContain(NEGOTIATION_MARKERS.rounds);
    expect(text).toContain(NEGOTIATION_MARKERS.redline);
    expect(text).toContain(NEGOTIATION_MARKERS.verdict);
    expect(text).toContain("Round 1 — convergence 30/100");
    expect(text).toContain("Round 3 — convergence 85/100");
    expect(text).toContain("RERA § 13");
    expect(text).toContain(contract.title);
  });

  it("narrates unclassifiable goals through the general playbook", () => {
    const result = runNegotiation(contract, "xyzzy");
    const text = composeNegotiationNarrative(result, contract.title);
    expect(text).toContain("convergence 20/100");
    expect(text).toContain(NEGOTIATION_MARKERS.verdict);
  });
});

describe("composers — empty and minimal inputs", () => {
  const empty: AnalysisResult = {
    clauses: [],
    assessments: [],
    heatmap: { clauseIds: [], dimensions: [], cells: [] },
    obligations: [],
    riskScore: 0,
  };

  it("composeAnalysisNarrative reports no exposure when nothing is risky", () => {
    const text = composeAnalysisNarrative(empty);
    expect(text).toContain(FALLBACK_MESSAGE);
    expect(text).toContain("No material one-sided exposure");
    expect(text).toContain("little textual leverage");
  });

  it("composeEmailDraft omits numbered asks when there are no negotiation points", () => {
    expect(composeEmailDraft(empty)).not.toContain("1.");
  });

  it("composeEmailDraft lists a single ask without a second point", () => {
    const single = analyzeClauses(
      segmentClauses("2. Deposit. The security deposit may be forfeited at the sole discretion of the Landlord."),
    );
    const email = composeEmailDraft(single);
    expect(email).toContain("1.");
    expect(email).not.toContain("2.");
  });

  it("composeSimulationCards degrades gracefully for an empty contract and generic scenario", () => {
    const bare: SimContract = { id: "bare", title: "Bare", kind: "other", text: "", provisions: [] };
    const text = composeSimulationCards(bare, "zzz qqq 999");
    expect(text).toContain(SIM_CARD_MARKERS.consequences);
    expect(text).toContain("exposure");
  });
});
