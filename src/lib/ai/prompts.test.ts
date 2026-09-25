import { describe, expect, it } from "vitest";

import {
  ANALYSIS_MARKERS,
  NEGOTIATION_MARKERS,
  SIM_CARD_MARKERS,
  buildAnalysisNarrativePrompt,
  buildAnalyzePrompt,
  buildComparePrompt,
  buildEmailPrompt,
  buildNegotiationNarrativePrompt,
  buildNegotiationPrompt,
  buildSimplifyPrompt,
  buildSimplifyStreamPrompt,
  buildSimulationCardsPrompt,
  buildSimulationStreamPrompt,
} from "@/lib/ai/prompts";
import type { Contract } from "@/domain/simulation/types";

const contract: Contract = {
  id: "c-1",
  title: "Flat Rental Agreement",
  kind: "rental",
  text: "The tenant shall pay Rs 25,000 monthly.",
  provisions: [],
};

describe("marker constants", () => {
  it("pins the analysis markers used by the UI splitter", () => {
    expect(ANALYSIS_MARKERS.partyA).toBe("PARTY A PERSPECTIVE:");
    expect(ANALYSIS_MARKERS.partyB).toBe("PARTY B PERSPECTIVE:");
  });

  it("pins the four simulation card markers with emoji", () => {
    expect(SIM_CARD_MARKERS.consequences).toBe("⚠️ Consequences:");
    expect(SIM_CARD_MARKERS.law).toBe("📜 Relevant Law:");
    expect(SIM_CARD_MARKERS.action).toBe("🎯 Recommended Action:");
    expect(SIM_CARD_MARKERS.score).toBe("📊 Risk Score:");
  });
});

describe("prompt builders", () => {
  it("buildAnalyzePrompt embeds the document and type", () => {
    const bundle = buildAnalyzePrompt("The tenant shall pay rent.", "rental");
    expect(bundle.system.length).toBeGreaterThan(20);
    expect(bundle.prompt).toContain("The tenant shall pay rent.");
    expect(bundle.prompt.toLowerCase()).toContain("rental");
  });

  it("buildSimplifyPrompt embeds the US grade target", () => {
    const bundle = buildSimplifyPrompt("hereinbefore", 6);
    expect(bundle.prompt).toContain("US grade 6");
  });

  it("buildSimplifyStreamPrompt mirrors simplify and accepts a language", () => {
    const bundle = buildSimplifyStreamPrompt("a clause", 8, "hi");
    expect(bundle.system.length + bundle.prompt.length).toBeGreaterThan(40);
    const all = `${bundle.system}\n${bundle.prompt}`.toLowerCase();
    expect(all).toContain("hindi");
  });

  it("buildComparePrompt embeds both versions", () => {
    const bundle = buildComparePrompt("base text", "target text");
    expect(bundle.prompt).toContain("base text");
    expect(bundle.prompt).toContain("target text");
  });

  it("buildSimulationStreamPrompt embeds scenario and contract title", () => {
    const bundle = buildSimulationStreamPrompt(contract, "Early termination");
    expect(bundle.prompt).toContain("Early termination");
    expect(bundle.prompt).toContain("Flat Rental Agreement");
  });

  it("buildAnalysisNarrativePrompt requires both perspective markers", () => {
    const bundle = buildAnalysisNarrativePrompt("document body", "nda");
    expect(bundle.system).toContain(ANALYSIS_MARKERS.partyA);
    expect(bundle.system).toContain(ANALYSIS_MARKERS.partyB);
  });

  it("buildSimulationCardsPrompt requires all four card markers", () => {
    const bundle = buildSimulationCardsPrompt(contract, "Non-payment");
    const all = bundle.system + bundle.prompt;
    expect(all).toContain(SIM_CARD_MARKERS.consequences);
    expect(all).toContain(SIM_CARD_MARKERS.law);
    expect(all).toContain(SIM_CARD_MARKERS.action);
    expect(all).toContain(SIM_CARD_MARKERS.score);
  });

  it("buildEmailPrompt keeps a professional tone constraint", () => {
    const bundle = buildEmailPrompt("negotiation context");
    expect(bundle.system.toLowerCase()).toContain("professional");
    expect(bundle.system.toLowerCase()).toContain("email");
    expect(bundle.prompt).toContain("negotiation context");
  });
});

describe("negotiation prompts (Engine 06)", () => {
  it("pins the three negotiation markers used by the UI splitter", () => {
    expect(NEGOTIATION_MARKERS.rounds).toBe("🔄 NEGOTIATION ROUNDS:");
    expect(NEGOTIATION_MARKERS.redline).toBe("📝 FINAL REDLINE:");
    expect(NEGOTIATION_MARKERS.verdict).toBe("⚖️ MEDIATOR VERDICT:");
  });

  it("buildNegotiationPrompt voices three agents and grounds in the legal DB", () => {
    const bundle = buildNegotiationPrompt(contract, "Reduce the deposit to one month");
    expect(bundle.system).toContain("PARTY A");
    expect(bundle.system).toContain("PARTY B");
    expect(bundle.system).toContain("MEDIATOR");
    expect(bundle.system).toContain("IRAC");
    // Deposit goal on a rental contract must surface RERA 13 and CPA 2(47).
    expect(bundle.system).toContain("RERA § 13");
    expect(bundle.system).toContain("CPA § 2(47)");
    expect(bundle.prompt).toContain("deposit");
    expect(bundle.prompt).toContain(contract.text);
  });

  it("buildNegotiationNarrativePrompt embeds the deterministic skeleton and markers", () => {
    const bundle = buildNegotiationNarrativePrompt(contract, "Shorten the notice period");
    expect(bundle.system).toContain(NEGOTIATION_MARKERS.rounds);
    expect(bundle.system).toContain(NEGOTIATION_MARKERS.redline);
    expect(bundle.system).toContain(NEGOTIATION_MARKERS.verdict);
    expect(bundle.prompt).toContain("Negotiation skeleton");
    expect(bundle.prompt).toContain("convergence 30/100");
    expect(bundle.prompt).toContain("TPA § 106");
  });
});
