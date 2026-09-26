import { describe, expect, it } from "vitest";

import {
  SIMPLIFICATION_DICTIONARY,
  assessReadability,
  detectJurisdiction,
  simplifyText,
} from "@/domain/simplification/engine";

describe("detectJurisdiction", () => {
  it("detects India from statutory phrases", () => {
    const out = detectJurisdiction(
      "This agreement is governed by the Indian Contract Act, 1872 and the Rent Act. Stamp duty applies.",
    );
    expect(out.code).toBe("IN");
    expect(out.label.length).toBeGreaterThan(0);
    expect(out.confidence).toBeGreaterThan(0.3);
    expect(out.signals.length).toBeGreaterThan(0);
    expect(out.confidence).toBeLessThanOrEqual(0.95);
  });

  it("caps confidence at 0.95 on many signals", () => {
    const out = detectJurisdiction(
      "Governed by the indian contract act and the indian stamp act. The rent control act, specific relief act, and consumer protection act apply. Amounts in inr incl gst. Venue: mumbai, india.",
    );
    expect(out.signals.length).toBeGreaterThanOrEqual(5);
    expect(out.confidence).toBe(0.95);
  });

  it("detects a US-Delaware flavour", () => {
    const out = detectJurisdiction("Organized under the Delaware General Corporation Law.");
    expect(out.code).toContain("US");
  });

  it("stays deterministic when two jurisdictions tie", () => {
    const first = detectJurisdiction("Delaware General Corporation Law and the Indian Contract Act");
    const second = detectJurisdiction("Delaware General Corporation Law and the Indian Contract Act");
    expect(first.code).toBe(second.code);
  });

  it("returns unknown with zero confidence when unstated", () => {
    const out = detectJurisdiction("Just two people renting a flat.");
    expect(out.code).toBe("unknown");
    expect(out.confidence).toBe(0);
    expect(out.signals).toEqual([]);
  });
});

describe("assessReadability", () => {
  it("computes sane metrics for plain text", () => {
    const out = assessReadability("The cat sat on the mat. The dog ran home.");
    expect(out.fleschReadingEase).toBeGreaterThan(0);
    expect(out.fleschKincaidGrade).toBeGreaterThanOrEqual(0);
    expect(out.avgSentenceLength).toBeGreaterThan(0);
    expect(["simple", "standard", "dense", "opaque"]).toContain(out.level);
  });

  it("grades dense legalese harder than plain speech", () => {
    const hard = assessReadability(
      "Notwithstanding the foregoing provisions hereof, the indemnifying party shall hereinafter hold harmless and indemnify the indemnified party.",
    );
    const easy = assessReadability("You must pay rent every month. Keep the flat clean.");
    expect(hard.fleschKincaidGrade).toBeGreaterThanOrEqual(easy.fleschKincaidGrade);
  });

  it("handles empty text without throwing", () => {
    const out = assessReadability("");
    expect(Number.isFinite(out.fleschKincaidGrade)).toBe(true);
  });
});

describe("simplifyText", () => {
  it("replaces dictionary legalese and reports the swaps", () => {
    const out = simplifyText("The parties agree in accordance with the terms herein.", 8);
    expect(out.simplified).not.toBe(out.original);
    expect(out.replacements.length).toBeGreaterThan(0);
    expect(out.replacements[0]?.from.length ?? 0).toBeGreaterThan(0);
    expect(out.targetLevel).toBe(8);
    expect(out.estimatedGrade).toBeGreaterThanOrEqual(0);
  });

  it("ships a non-empty dictionary", () => {
    expect(SIMPLIFICATION_DICTIONARY.length).toBeGreaterThan(5);
  });

  it("leaves plain text mostly untouched", () => {
    const out = simplifyText("Pay the rent on time.", 8);
    expect(out.simplified).toContain("Pay the rent");
    expect(out.replacements).toEqual([]);
  });

  it("applies many dictionary swaps in one pass", () => {
    const kitchenSink = SIMPLIFICATION_DICTIONARY.map((entry) => entry.from).join(" and ");
    const out = simplifyText(kitchenSink, 6);
    expect(out.replacements.length).toBeGreaterThan(5);
  });
});

describe("assessReadability grade bands", () => {
  it("classifies dense and opaque texts into distinct levels", () => {
    const dense = assessReadability(
      "The tenant agrees to pay the monthly rent to the landlord before the fifth day of each month without any deduction or setoff against the same.",
    );
    const opaque = assessReadability(
      "Notwithstanding anything contained hereinbefore to the contrary the aforementioned lessee shall indemnify compensate reimburse and hold harmless the lessor from every liability obligation claim whatsoever arising thereunder.",
    );
    expect(dense.level).toBe("dense");
    expect(opaque.level).toBe("opaque");
    expect(opaque.fleschKincaidGrade).toBeGreaterThan(dense.fleschKincaidGrade);
  });
});
