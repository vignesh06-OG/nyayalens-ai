import { describe, expect, it } from "vitest";

import {
  KEYWORD_SIGNALS,
  analyzeClauses,
  assessClauseRisk,
  computeRiskScore,
  dominantDimension,
  extractObligations,
  generateHeatmapData,
  levelForScore,
  segmentClauses,
  splitSentences,
} from "@/domain/analysis/engine";
import { RISK_DIMENSIONS, type Clause } from "@/domain/analysis/types";

const RISKY: Clause = {
  id: "c1",
  reference: "Clause 1",
  title: "Indemnity",
  text: "The Tenant shall indemnify and hold harmless the Landlord from unlimited liability at the sole discretion of the Landlord, without limitation. This clause is null and void if best efforts fail.",
};
const BENIGN: Clause = {
  id: "c2",
  reference: "Clause 2",
  title: "Notices",
  text: "A notice may be sent by email.",
};

describe("splitSentences", () => {
  it("splits on sentence punctuation", () => {
    expect(splitSentences("One. Two! Three?")).toHaveLength(3);
  });

  it("splits on newlines and drops empties", () => {
    expect(splitSentences("a\n\nb \n ")).toEqual(["a", "b"]);
  });
});

describe("levelForScore", () => {
  it("maps the four bands", () => {
    expect(levelForScore(0)).toBe("low");
    expect(levelForScore(25)).toBe("medium");
    expect(levelForScore(50)).toBe("high");
    expect(levelForScore(75)).toBe("critical");
    expect(levelForScore(100)).toBe("critical");
  });
});

describe("dominantDimension", () => {
  it("picks the highest-scoring dimension", () => {
    const scores = { ambiguity: 10, liability: 90, termination: 20, payment: 5, confidentiality: 0, renewal: 0 };
    expect(dominantDimension(scores)).toBe("liability");
  });

  it("keeps the earliest dimension on ties", () => {
    const scores = { ambiguity: 40, liability: 40, termination: 0, payment: 0, confidentiality: 0, renewal: 0 };
    expect(dominantDimension(scores)).toBe("ambiguity");
  });
});

describe("segmentClauses", () => {
  it("splits on blank lines into referenced clauses", () => {
    const clauses = segmentClauses(`${RISKY.text}\n\n${BENIGN.text}`);
    expect(clauses).toHaveLength(2);
    expect(clauses[0]?.reference.startsWith("Clause")).toBe(true);
    expect(clauses[0]?.text).toContain("indemnify");
  });

  it("uses numbered headings as references when present", () => {
    const clauses = segmentClauses("1. Indemnity. The Tenant shall save harmless everyone.");
    expect(clauses[0]?.reference).toContain("1");
  });

  it("returns an empty array for empty input", () => {
    expect(segmentClauses("")).toEqual([]);
  });
});

describe("assessClauseRisk", () => {
  it("returns scores across all six dimensions, bounded 0–100", () => {
    const assessment = assessClauseRisk(RISKY);
    expect(assessment.score).toBeGreaterThanOrEqual(0);
    expect(assessment.score).toBeLessThanOrEqual(100);
    for (const dimension of RISK_DIMENSIONS) {
      expect(assessment.dimensionScores[dimension]).toBeGreaterThanOrEqual(0);
      expect(assessment.dimensionScores[dimension]).toBeLessThanOrEqual(100);
    }
    expect(["low", "medium", "high", "critical"]).toContain(assessment.riskLevel);
  });

  it("scores risky boilerplate above benign notices", () => {
    expect(assessClauseRisk(RISKY).score).toBeGreaterThan(assessClauseRisk(BENIGN).score);
  });

  it("exposes liability keyword signals in the data", () => {
    expect(KEYWORD_SIGNALS.liability.length).toBeGreaterThan(0);
  });
});

describe("generateHeatmapData", () => {
  it("covers every clause × dimension", () => {
    const clauses = [RISKY, BENIGN];
    const assessments = clauses.map(assessClauseRisk);
    const heatmap = generateHeatmapData(clauses, assessments);
    expect(heatmap.cells).toHaveLength(12);
    expect(heatmap.dimensions).toHaveLength(6);
    expect(heatmap.clauseIds).toEqual(["c1", "c2"]);
  });

  it("recomputes assessments when they are omitted", () => {
    const heatmap = generateHeatmapData([BENIGN]);
    expect(heatmap.cells).toHaveLength(6);
  });
});

describe("extractObligations", () => {
  it("finds shall/must duties with party attribution", () => {
    const obligations = extractObligations([RISKY]);
    expect(obligations.length).toBeGreaterThanOrEqual(1);
    const duty = obligations[0];
    expect(duty?.action.toLowerCase()).toContain("indemnify");
    expect(["party-a", "party-b", "both"]).toContain(duty?.party);
    expect(duty?.clauseId).toBe("c1");
  });

  it("returns an empty list without duty language", () => {
    expect(extractObligations([BENIGN])).toEqual([]);
  });
});

describe("computeRiskScore / analyzeClauses", () => {
  it("returns 0 for no assessments", () => {
    expect(computeRiskScore([])).toBe(0);
  });

  it("equals the single assessment score for one item", () => {
    const one = assessClauseRisk(RISKY);
    expect(computeRiskScore([one])).toBeCloseTo(one.score, 5);
  });

  it("analyzeClauses produces the full AnalysisResult", () => {
    const result = analyzeClauses([RISKY, BENIGN]);
    expect(result.clauses).toHaveLength(2);
    expect(result.assessments).toHaveLength(2);
    expect(result.heatmap.cells).toHaveLength(12);
    expect(result.riskScore).toBeGreaterThan(0);
  });
});
