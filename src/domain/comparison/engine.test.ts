import { describe, expect, it } from "vitest";

import { assessRiskDelta, computeSemanticDiff, riskLevelForScore } from "@/domain/comparison/engine";
import type { Document } from "@/domain/comparison/types";

const baseDoc = (text: string): Document => ({ id: "A", title: "Base", kind: "rental", text });
const targetDoc = (text: string): Document => ({ id: "B", title: "Target", kind: "rental", text });

const CLAUSE_1 = "1. Payment. The Tenant shall pay Rs 25,000 on the 5th of each month for the flat.";
const CLAUSE_2 = "2. Deposit. The security deposit is Rs 5,00,000 and is fully refundable on exit.";
const CLAUSE_3 = "3. Notice. Either party may terminate this tenancy with 30 days written notice.";
const BASE = `${CLAUSE_1}\n\n${CLAUSE_2}\n\n${CLAUSE_3}`;

describe("computeSemanticDiff", () => {
  it("marks identical documents unchanged with zero counts", () => {
    const diff = computeSemanticDiff(baseDoc(BASE), targetDoc(BASE));
    expect(diff.addedCount).toBe(0);
    expect(diff.removedCount).toBe(0);
    expect(diff.modifiedCount).toBe(0);
    expect(diff.diffs.some((d) => d.changeKind === "unchanged")).toBe(true);
  });

  it("detects an added clause", () => {
    const diff = computeSemanticDiff(
      baseDoc(BASE),
      targetDoc(`${BASE}\n\n4. Confidentiality. The secret recipe stays secret forever.`),
    );
    expect(diff.addedCount).toBe(1);
    const added = diff.diffs.find((d) => d.changeKind === "added");
    expect(added?.targetText).toContain("recipe");
    expect(added?.baseText).toBeNull();
  });

  it("detects a removed clause", () => {
    const diff = computeSemanticDiff(baseDoc(BASE), targetDoc(`${CLAUSE_1}\n\n${CLAUSE_2}`));
    expect(diff.removedCount).toBe(1);
    const removed = diff.diffs.find((d) => d.changeKind === "removed");
    expect(removed?.baseText).toContain("Notice");
    expect(removed?.targetText).toBeNull();
  });

  it("detects a modified clause with partial similarity", () => {
    const harsherDeposit =
      "2. Deposit. The security deposit is Rs 5,00,000 and may be forfeited at the sole discretion of the Landlord without any refund on exit.";
    const diff = computeSemanticDiff(baseDoc(BASE), targetDoc(`${CLAUSE_1}\n\n${harsherDeposit}\n\n${CLAUSE_3}`));
    const changed = diff.diffs.find((d) => d.changeKind === "modified");
    expect(diff.modifiedCount).toBe(1);
    expect(changed?.similarity).toBeGreaterThan(0);
    expect(changed?.similarity).toBeLessThan(1);
    expect(changed?.summary).toMatch(/moved|wording/i);
  });

  it("summarises counts in words", () => {
    const diff = computeSemanticDiff(baseDoc(BASE), targetDoc(BASE));
    expect(diff.summary).toMatch(/added, .* removed, .* modified/);
  });
});

describe("assessRiskDelta", () => {
  it("reports a near-zero delta for identical versions", () => {
    const diff = computeSemanticDiff(baseDoc(BASE), targetDoc(BASE));
    const delta = assessRiskDelta(diff);
    expect(Math.abs(delta.delta)).toBeLessThan(0.01);
  });

  it("quantifies movement for a risky amendment", () => {
    const harsher = BASE.replace("30 days written notice", "2 days notice at the sole discretion of the Landlord");
    const diff = computeSemanticDiff(baseDoc(BASE), targetDoc(harsher));
    const delta = assessRiskDelta(diff);
    expect(delta.baseScore).toBeGreaterThanOrEqual(0);
    expect(delta.targetScore).toBeGreaterThanOrEqual(0);
    expect(typeof delta.delta).toBe("number");
    expect(delta.targetScore).toBeGreaterThan(delta.baseScore);
  });

  it("writes movement notes for added and removed clauses", () => {
    const diff = computeSemanticDiff(
      baseDoc(BASE),
      targetDoc(`${CLAUSE_1}\n\n4. Confidentiality. The secret recipe stays secret forever.`),
    );
    const delta = assessRiskDelta(diff);
    expect(delta.movements.length).toBeGreaterThan(0);
    expect(delta.movements.some((m) => /New clause|exposure/i.test(m.note))).toBe(true);
  });

  it("handles stopword-only documents without dividing by zero", () => {
    const diff = computeSemanticDiff(baseDoc("the and for that"), targetDoc("the and for that"));
    expect(diff.diffs.length).toBeGreaterThan(0);
    expect(Number.isFinite(assessRiskDelta(diff).delta)).toBe(true);
  });
});

describe("riskLevelForScore", () => {
  it("aliases levelForScore bands", () => {
    expect(riskLevelForScore(10)).toBe("low");
    expect(riskLevelForScore(90)).toBe("critical");
  });
});
