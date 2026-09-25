import { describe, expect, it } from "vitest";

import { alignmentManifest, keywordAlignment, type AlignmentStatus } from "@/domain/challenge/alignment-manifest";

const VALID: readonly AlignmentStatus[] = ["complete", "foundation", "in-progress", "planned"];

describe("keywordAlignment (problem-statement map)", () => {
  it("covers every mandated problem-statement keyword", () => {
    expect(keywordAlignment.length).toBeGreaterThanOrEqual(7);
    const keywords = keywordAlignment.map((row) => row.keyword.toLowerCase());
    for (const required of [
      "simplifying complex legal documents",
      "comparing contracts",
      "highlighting important clauses",
      "answering questions",
      "understanding options",
      "summaries, checklists",
      "legal professional",
    ]) {
      expect(keywords.some((k) => k.includes(required.split(",")[0] ?? required))).toBe(true);
    }
  });

  it("gives every row the four mandated columns, non-empty", () => {
    for (const row of keywordAlignment) {
      expect(row.feature.length).toBeGreaterThan(0);
      expect(row.whatItDoes.length).toBeGreaterThan(0);
      expect(row.whyItAligns.length).toBeGreaterThan(0);
      expect(row.measurableOutcome.length).toBeGreaterThan(0);
    }
  });

  it("uses unique ids and honest statuses", () => {
    const ids = new Set(keywordAlignment.map((row) => row.id));
    expect(ids.size).toBe(keywordAlignment.length);
    for (const row of keywordAlignment) {
      expect(VALID).toContain(row.status);
    }
  });

  it("names the seven mandated features", () => {
    const features = keywordAlignment.map((row) => row.feature);
    for (const required of [
      "Plain Language Converter",
      "Contract Comparator",
      "Adversarial Analysis",
      "Scenario Simulator",
      "What-If Simulator",
      "Action Kit",
      "Lawyer Prep Sheet",
    ]) {
      expect(features).toContain(required);
    }
  });
});

describe("alignmentManifest", () => {
  it("keeps engineering evidence entries honest", () => {
    expect(alignmentManifest.length).toBeGreaterThanOrEqual(7);
    for (const entry of alignmentManifest) {
      expect(VALID).toContain(entry.status);
      expect(entry.module.length).toBeGreaterThan(0);
    }
  });
});
