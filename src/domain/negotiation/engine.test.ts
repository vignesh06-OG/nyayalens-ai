import { describe, expect, it } from "vitest";

import type { Contract, LegalProvision } from "@/domain/simulation/types";

import { detectGoalKind, formatRedlineDocument, runNegotiation } from "./engine";
import { NEGOTIATION_GOALS, NEGOTIATION_ROUNDS } from "./types";

const provisions: LegalProvision[] = [
  { id: "p1", reference: "3", text: "The tenant shall pay a security deposit of three months' rent.", topic: "payment" },
  { id: "p2", reference: "7", text: "Either party may terminate with 90 days notice.", topic: "termination" },
  { id: "p3", reference: "9", text: "Late rent attracts a penalty of 3% per week.", topic: "payment" },
];

const contract: Contract = {
  id: "c-neg",
  title: "Flat Rental Agreement",
  kind: "rental",
  text: provisions.map((p) => p.text).join("\n\n"),
  provisions,
};

describe("detectGoalKind", () => {
  const cases: Array<[string, (typeof NEGOTIATION_GOALS)[number]]> = [
    ["Reduce the security deposit to one month", "deposit"],
    ["Shorten the notice period to 30 days", "notice"],
    ["What are my options to terminate this early?", "termination"],
    ["Cap the late-payment penalty", "penalty"],
    ["Restructure the rent payment schedule", "payment"],
    ["Limit the annual escalation to 5 percent", "escalation"],
    ["Remove the auto-renew lock-in", "renewal"],
    ["Make the confidentiality obligations mutual", "confidentiality"],
    ["Carve out my background IP from the assignment", "ip"],
    ["Something completely unrelated xyz", "general"],
    ["", "general"],
  ];
  it.each(cases)("classifies %j as %s", (goal, expected) => {
    expect(detectGoalKind(goal)).toBe(expected);
  });
});

describe("runNegotiation — structure", () => {
  const result = runNegotiation(contract, "Reduce the deposit to one month");

  it("runs exactly three rounds with correct numbering", () => {
    expect(result.rounds).toHaveLength(NEGOTIATION_ROUNDS);
    result.rounds.forEach((round, index) => {
      expect(round.round).toBe(index + 1);
      expect(round.partyA.round).toBe(index + 1);
      expect(round.partyB.round).toBe(index + 1);
      expect(round.mediator.round).toBe(index + 1);
    });
  });

  it("escalates Party A from aggressive to conciliatory while Party B settles", () => {
    expect(result.rounds[0]?.partyA.stance).toBe("aggressive");
    expect(result.rounds[2]?.partyA.stance).toBe("conciliatory");
    expect(result.rounds[2]?.partyB.stance).toBe("settled");
  });

  it("records no concessions in round 1 and some in later rounds", () => {
    expect(result.rounds[0]?.partyA.concessions).toEqual([]);
    expect(result.rounds[0]?.partyB.concessions).toEqual([]);
    expect(result.rounds[1]?.partyA.concessions.length).toBe(1);
    expect(result.rounds[2]?.partyB.concessions.length).toBe(1);
  });

  it("converges monotonically and ends at the agreement score", () => {
    const convergences = result.rounds.map((r) => r.mediator.convergence);
    expect(convergences).toEqual([...convergences].sort((a, b) => a - b));
    expect(result.agreementScore).toBe(convergences[convergences.length - 1]);
  });

  it("grounds Party B and the Mediator in real statutes from round one", () => {
    expect(result.rounds[0]?.partyB.citations.length).toBeGreaterThan(0);
    expect(result.rounds[0]?.mediator.citations.length).toBeGreaterThan(0);
    // Deposit goal on a rental contract must reach RERA 13 and CPA 2(47).
    expect(result.statutoryBasis).toContain("RERA § 13");
    expect(result.statutoryBasis).toContain("CPA § 2(47)");
  });

  it("echoes the goal statement and includes the not-legal-advice disclaimer", () => {
    expect(result.goal).toBe("deposit");
    expect(result.goalStatement).toBe("Reduce the deposit to one month");
    expect(result.finalSummary).toContain("Not legal advice");
  });
});

describe("runNegotiation — redlines", () => {
  it("targets matched clauses, ranked by risk, capped at two", () => {
    const result = runNegotiation(contract, "Cut the deposit and penalty exposure");
    expect(result.finalRedlines.length).toBeGreaterThan(0);
    expect(result.finalRedlines.length).toBeLessThanOrEqual(2);
    for (const item of result.finalRedlines) {
      expect(provisions.map((p) => p.reference)).toContain(item.clauseReference);
      expect(item.proposedText.length).toBeGreaterThan(20);
      expect(item.citations.length).toBeGreaterThan(0);
    }
  });

  it("falls back to a General redline when no clause matches", () => {
    const bare: Contract = { ...contract, provisions: [] };
    const result = runNegotiation(bare, "Reduce the deposit");
    expect(result.finalRedlines).toHaveLength(1);
    expect(result.finalRedlines[0]?.clauseReference).toBe("General");
  });

  it("uses the lower convergence ladder for unclassifiable goals", () => {
    const result = runNegotiation(contract, "xyzzy plugh");
    expect(result.goal).toBe("general");
    expect(result.agreementScore).toBe(70);
  });
});

describe("runNegotiation — purity and determinism", () => {
  it("returns identical output for identical input", () => {
    const a = runNegotiation(contract, "Shorten the notice period");
    const b = runNegotiation(contract, "Shorten the notice period");
    expect(a).toEqual(b);
  });

  it("does not mutate the input contract", () => {
    const before = JSON.stringify(contract);
    runNegotiation(contract, "Cap the penalty");
    expect(JSON.stringify(contract)).toBe(before);
  });

  it("handles very long goal text without crashing", () => {
    const long = "deposit ".repeat(500);
    const result = runNegotiation(contract, long);
    expect(result.goal).toBe("deposit");
    expect(result.rounds).toHaveLength(NEGOTIATION_ROUNDS);
  });
});

describe("formatRedlineDocument", () => {
  it("produces a complete plain-text export", () => {
    const result = runNegotiation(contract, "Reduce the deposit");
    const doc = formatRedlineDocument(result, contract.title);
    expect(doc).toContain("NyayaLens AI — Negotiation Redline");
    expect(doc).toContain(contract.title);
    expect(doc).toContain("== NEGOTIATION ROUNDS ==");
    expect(doc).toContain("Round 3");
    expect(doc).toContain("== FINAL REDLINES ==");
    expect(doc).toContain("Mediator:");
    expect(doc).toContain("not legal advice");
  });
});
