import { describe, expect, it } from "vitest";

import {
  computeRiskProbability,
  evaluateScenario,
  mapConsequences,
  mapLawReferences,
  provisionsFromClauses,
  toScenarioClauses,
} from "@/domain/simulation/engine";
import { SCENARIO_KINDS, type Contract, type LegalProvision } from "@/domain/simulation/types";

const provisions: LegalProvision[] = [
  { id: "p1", reference: "1", text: "Rent of Rs 25,000 is due on the 5th of each month.", topic: "payment" },
  { id: "p2", reference: "2", text: "The deposit may be forfeited at the sole discretion of the landlord.", topic: "deposit" },
  { id: "p3", reference: "3", text: "Either party may terminate with 30 days notice.", topic: "termination" },
];

const contract: Contract = {
  id: "c-1",
  title: "Flat Rental Agreement",
  kind: "rental",
  text: provisions.map((p) => p.text).join("\n\n"),
  provisions,
};

describe("provisionsFromClauses / toScenarioClauses", () => {
  it("derives clauses from provisions and provisions back from clauses", () => {
    const clauses = toScenarioClauses(contract);
    expect(clauses).toHaveLength(contract.provisions.length);
    const roundTripped = provisionsFromClauses(clauses);
    expect(roundTripped).toHaveLength(clauses.length);
    expect(roundTripped[0]?.topic.length ?? 0).toBeGreaterThan(0);
    expect(roundTripped[0]?.reference.length ?? 0).toBeGreaterThan(0);
  });

  it("handles an empty provision list", () => {
    expect(provisionsFromClauses([])).toEqual([]);
    expect(toScenarioClauses({ ...contract, provisions: [] })).toEqual([]);
  });
});

describe("evaluateScenario", () => {
  it("implicates provisions and consequence chains for a breach", () => {
    const result = evaluateScenario(contract, "Tenant fails to pay the rent on time — breach of the payment duty");
    expect(result.summary).toMatch(/provision/i);
    expect(result.provisions.length).toBeGreaterThan(0);
    expect(result.consequences.length).toBeGreaterThan(0);
  });

  it("classifies an early-termination scenario", () => {
    const result = evaluateScenario(contract, "Early termination before the lease ends");
    expect(result.scenario.kind).toBe("termination");
  });

  it("classifies non-payment as a payment/breach scenario", () => {
    const result = evaluateScenario(contract, "Non-payment of the monthly rent");
    expect(["payment", "breach"]).toContain(result.scenario.kind);
  });

  it("covers every scenario kind with a classification", () => {
    const samples: Record<string, string> = {
      breach: "This is a breach of the covenant",
      termination: "Early termination notice",
      payment: "Payment of rent is late",
      dispute: "A dispute may end in court",
      renewal: "Renewal of the lease term",
      general: "Just asking about the garden",
    };
    for (const kind of SCENARIO_KINDS) {
      const result = evaluateScenario(contract, samples[kind] ?? "general question");
      expect(typeof result.scenario.kind).toBe("string");
    }
  });
});

describe("mapConsequences / computeRiskProbability", () => {
  it("maps consequences with calibrated probabilities in 0..1", () => {
    const result = evaluateScenario(contract, "breach and non-payment");
    const consequences = mapConsequences(result);
    expect(consequences.length).toBeGreaterThan(0);
    for (const consequence of consequences) {
      const probability = computeRiskProbability(consequence);
      expect(probability.value).toBeGreaterThanOrEqual(0);
      expect(probability.value).toBeLessThanOrEqual(1);
      expect(["rare", "unlikely", "possible", "likely", "near-certain"]).toContain(probability.band);
    }
  });

  it("attenuates severity and probability across mitigation and horizon branches", () => {
    const result = evaluateScenario(contract, "breach via non-payment of rent");
    const base = mapConsequences(result)[0];
    expect(base).toBeDefined();
    if (base === undefined) {
      return;
    }
    const variants = [
      { ...base, severity: "critical" as const, timeHorizon: "immediate" as typeof base.timeHorizon, mitigations: [] },
      { ...base, severity: "high" as const, timeHorizon: "30 days" as typeof base.timeHorizon, mitigations: ["notice"] },
      { ...base, severity: "medium" as const, timeHorizon: null, mitigations: ["notice", "cure"] },
      { ...base, severity: "low" as const, timeHorizon: "3 years" as typeof base.timeHorizon, mitigations: ["a", "b", "c"] },
    ];
    const values = variants.map((variant) => computeRiskProbability(variant).value);
    expect(values[0]).toBeGreaterThan(values[3] ?? 0);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe("law references", () => {
  it("mapLawReferences cites statutes with § anchors for a breach", () => {
    const result = evaluateScenario(contract, "breach of the payment covenant");
    const refs = mapLawReferences(result);
    expect(refs.length).toBeGreaterThan(0);
    expect(refs[0]?.act.length ?? 0).toBeGreaterThan(0);
    expect(refs[0]?.section.startsWith("§")).toBe(true);
    expect(refs[0]?.title.length ?? 0).toBeGreaterThan(0);
  });

  it("provides anchors for every scenario kind", () => {
    const samples = [
      "This is a breach of the covenant",
      "Early termination notice",
      "Payment of rent is late",
      "A dispute may end in court",
      "Renewal of the lease term",
      "Just asking about the garden",
    ];
    for (const sample of samples) {
      const refs = mapLawReferences(evaluateScenario(contract, sample));
      expect(refs.length).toBeGreaterThan(0);
    }
  });
});
