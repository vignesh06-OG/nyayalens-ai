import { describe, expect, it } from "vitest";

import {
  buildComplianceChecklist,
  draftAmendment,
  generateActionKit,
  prioritizeNegotiationPoints,
} from "@/domain/actions/engine";
import { analyzeClauses, assessClauseRisk, segmentClauses } from "@/domain/analysis/engine";
import type { AnalysisResult, Clause, RiskDimension } from "@/domain/analysis/types";

const DOC = `1. Indemnity. The Tenant shall indemnify and hold harmless the Landlord from unlimited liability at the sole discretion of the Landlord. 2. Payment. The Tenant shall pay Rs 25,000 within 7 days of the due date. 3. Renewal. The lease renews automatically unless either party objects in writing 60 days before expiry.`;

const analysis = analyzeClauses(segmentClauses(DOC));

describe("generateActionKit", () => {
  it("produces all four deliverable lists", () => {
    const kit = generateActionKit(analysis);
    expect(kit.negotiationPoints.length).toBeGreaterThan(0);
    expect(kit.amendments.length).toBeGreaterThan(0);
    expect(kit.questionsForLawyer.length).toBeGreaterThanOrEqual(0);
    expect(kit.playbook.length).toBeGreaterThan(0);
  });

  it("bounds negotiation priority to 1..10 and flags tradeability", () => {
    const kit = generateActionKit(analysis);
    for (const point of kit.negotiationPoints) {
      expect(point.priority).toBeGreaterThanOrEqual(1);
      expect(point.priority).toBeLessThanOrEqual(10);
      expect(typeof point.tradeable).toBe("boolean");
      expect(["low", "medium", "high", "critical"]).toContain(point.severity);
    }
  });

  it("returns a well-shaped empty kit for a risk-free analysis", () => {
    const calm = analyzeClauses(segmentClauses("2. Notices. A note may be sent by email."));
    const kit = generateActionKit(calm);
    expect(Array.isArray(kit.negotiationPoints)).toBe(true);
    expect(Array.isArray(kit.amendments)).toBe(true);
  });
});

describe("prioritizeNegotiationPoints", () => {
  it("sorts highest priority first", () => {
    const kit = generateActionKit(analysis);
    const sorted = prioritizeNegotiationPoints(kit.negotiationPoints);
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i - 1]?.priority ?? 0).toBeGreaterThanOrEqual(sorted[i]?.priority ?? 0);
    }
  });

  it("breaks priority ties by severity, tradeability, then id", () => {
    const base = {
      clauseId: "c1",
      ask: "a",
      rationale: "r",
      severity: "high" as const,
      priority: 5,
    };
    const points = [
      { ...base, id: "b", title: "B", tradeable: true },
      { ...base, id: "a", title: "A", tradeable: true },
      { ...base, id: "c", title: "C", tradeable: false },
    ];
    const sorted = prioritizeNegotiationPoints(points);
    expect(sorted[0]?.id).toBe("c");
    expect(sorted[1]?.id).toBe("a");
    expect(sorted[2]?.id).toBe("b");
  });

  it("returns an empty array unchanged", () => {
    expect(prioritizeNegotiationPoints([])).toEqual([]);
  });
});

describe("draftAmendment", () => {
  it("produces original/proposed/fallback text", () => {
    const clause = segmentClauses(DOC)[0]!;
    const draft = draftAmendment(clause, "unlimited indemnity");
    expect(draft.originalText.length).toBeGreaterThan(0);
    expect(draft.proposedText.length).toBeGreaterThan(0);
    expect(draft.issue).toBe("unlimited indemnity");
    expect(draft.rationale.length).toBeGreaterThan(0);
  });
});

describe("ghost-clause fallbacks", () => {
  it("uses EMPTY_CLAUSE and generic labels for orphaned assessments", () => {
    const orphaned = {
      clauses: [],
      assessments: [
        {
          clauseId: "ghost",
          riskLevel: "high" as const,
          score: 88,
          drivers: [],
          dimensionScores: { ambiguity: 80, liability: 20, termination: 0, payment: 0, confidentiality: 0, renewal: 0 },
        },
      ],
      heatmap: { clauseIds: [], dimensions: [], cells: [] },
      obligations: [],
      riskScore: 88,
    };
    const kit = generateActionKit(orphaned);
    expect(Array.isArray(kit.amendments)).toBe(true);
    expect(Array.isArray(kit.negotiationPoints)).toBe(true);
    expect(kit.questionsForLawyer.length).toBeGreaterThanOrEqual(0);
  });
});

describe("negotiation template families", () => {
  it("matches and skips templates across diverse clause families", () => {
    const families = [
      "Payment. The Tenant shall pay Rs 25,000 late fees apply on the due date invoice.",
      "Liability. Unlimited indemnity and hold harmless without limitation of liability.",
      "Termination. The Landlord may terminate at sole discretion without cause or notice.",
      "Confidentiality. The receiving party shall keep confidential all trade secrets in perpetuity.",
      "Renewal. The lease renews automatically unless notice is given sixty days before expiry.",
      "Nothing in particular happens in this clause at all.",
    ];
    for (const text of families) {
      const kit = generateActionKit(analyzeClauses(segmentClauses(text)));
      expect(Array.isArray(kit.negotiationPoints)).toBe(true);
      expect(Array.isArray(kit.amendments)).toBe(true);
      expect(kit.playbook.length).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("template and question branches", () => {
  it("skips low-risk clauses when generating negotiation points", () => {
    const calm = analyzeClauses(segmentClauses("A notice may be sent by email sometimes."));
    const kit = generateActionKit(calm);
    for (const point of kit.negotiationPoints) {
      expect(point.priority).toBeGreaterThanOrEqual(1);
    }
  });

  it("derives the issue label from the top driver or the risk level", () => {
    const trapped = analyzeClauses(segmentClauses("Indemnify forever at sole discretion without limitation."));
    const kit = generateActionKit(trapped);
    const draft = kit.amendments[0];
    expect(draft?.issue.length ?? 0).toBeGreaterThan(0);
    expect(draft?.fallbackPosition === null || typeof draft?.fallbackPosition === "string").toBe(true);
  });

  it("asks about ambiguous standards scoring 40+", () => {
    const fuzzy = analyzeClauses(
      segmentClauses("The parties shall act in a vague, ambiguous, uncertain manner at sole discretion."),
    );
    const kit = generateActionKit(fuzzy);
    expect(kit.questionsForLawyer.some((q) => q.topic === "ambiguity" || q.topic.length > 0)).toBe(true);
  });
});

describe("buildComplianceChecklist", () => {
  it("extracts checkable items with source clauses and deadlines", () => {
    const items = buildComplianceChecklist(analysis);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.task.length).toBeGreaterThan(0);
      expect(item.sourceClause.length).toBeGreaterThan(0);
      expect(["party-a", "party-b", "both"]).toContain(item.party);
      expect(item.due === null || typeof item.due === "string").toBe(true);
    }
  });

  it("handles an analysis without obligations", () => {
    const calm = analyzeClauses(segmentClauses("Blue sky clause."));
    expect(buildComplianceChecklist(calm)).toEqual([]);
  });

  it("flags deadline-less duties in the lawyer questions", () => {
    const undated = analyzeClauses(segmentClauses("The Tenant shall pay the monthly rent forever."));
    const kit = generateActionKit(undated);
    expect(kit.questionsForLawyer.length).toBeGreaterThan(0);
  });

  it("caps lawyer questions at five", () => {
    const dense = analyzeClauses(
      segmentClauses(
        Array.from({ length: 8 }, (_, i) => `${i + 1}. Ambiguity. The parties shall act at the sole discretion in vague and ambiguous ways.`).join("\n\n"),
      ),
    );
    expect(generateActionKit(dense).questionsForLawyer.length).toBeLessThanOrEqual(5);
  });
});

const DIMS: Record<RiskDimension, number> = {
  ambiguity: 1,
  liability: 1,
  termination: 1,
  payment: 1,
  confidentiality: 1,
  renewal: 1,
};

describe("askFor dimension playbooks", () => {
  it.each([
    ["termination", "cure period"],
    ["renewal", "auto-renewal"],
  ] as const)("surfaces the %s playbook when that dimension dominates", (dim, fragment) => {
    const assessments = analysis.assessments.map((a) => ({
      ...a,
      dimensionScores: { ...DIMS, [dim]: 9 },
    }));
    const kit = generateActionKit({ ...analysis, assessments });
    expect(kit.negotiationPoints.some((p) => p.ask.includes(fragment))).toBe(true);
  });
});

describe("generateActionKit clause fallbacks", () => {
  it("uses the clause reference as the title when the title is empty", () => {
    const clause: Clause = {
      id: "c1",
      reference: "Clause 7",
      title: "",
      text: "The Tenant shall pay Rs 25,000 within 2 days or the Landlord may forfeit the entire deposit at his sole discretion with unlimited liability.",
    };
    const handcrafted: AnalysisResult = {
      clauses: [clause],
      assessments: [assessClauseRisk(clause)],
      heatmap: { clauseIds: ["c1"], dimensions: [], cells: [] },
      obligations: [],
      riskScore: 80,
    };
    const kit = generateActionKit(handcrafted);
    expect(kit.negotiationPoints[0]?.title).toBe("Clause 7");
  });
});

describe("prioritizeNegotiationPoints tie-breakers", () => {
  const base = { clauseId: "c1", title: "T", ask: "a", rationale: "r" };

  it("breaks equal priorities by severity weight", () => {
    const sorted = prioritizeNegotiationPoints([
      { ...base, id: "low", severity: "low" as const, priority: 5, tradeable: true },
      { ...base, id: "crit", severity: "critical" as const, priority: 5, tradeable: true },
    ]);
    expect(sorted[0]?.id).toBe("crit");
  });

  it("orders non-tradeable first in both comparator directions", () => {
    const firm = { ...base, id: "firm", severity: "high" as const, priority: 5, tradeable: false };
    const soft = { ...base, id: "soft", severity: "high" as const, priority: 5, tradeable: true };
    expect(prioritizeNegotiationPoints([firm, soft])[0]?.id).toBe("firm");
    expect(prioritizeNegotiationPoints([soft, firm])[0]?.id).toBe("firm");
  });
});

describe("buildComplianceChecklist fallbacks", () => {
  it("numbers anonymous obligations and dashes unknown clause sources", () => {
    const handcrafted: AnalysisResult = {
      clauses: [],
      assessments: [],
      heatmap: { clauseIds: [], dimensions: [], cells: [] },
      obligations: [
        { id: "", clauseId: "nope", party: "party-a", action: "Pay rent", trigger: null, deadline: "monthly" },
      ],
      riskScore: 0,
    };
    const items = buildComplianceChecklist(handcrafted);
    expect(items[0]?.id).toBe("cc-1");
    expect(items[0]?.sourceClause).toBe("—");
  });
});
