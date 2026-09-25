import { describe, expect, it } from "vitest";

import { analyzeClauses, segmentClauses } from "@/domain/analysis/engine";
import { buildComplianceChecklist, generateActionKit } from "@/domain/actions/engine";
import { assessRiskDelta, computeSemanticDiff } from "@/domain/comparison/engine";
import { fallbackAnalyze, fallbackSimplify } from "@/lib/ai/fallback";
import { composeEmailDraft } from "@/lib/ai/narratives";
import { ANALYSIS_MARKERS, SIM_CARD_MARKERS } from "@/lib/ai/prompts";
import { sectionAfter } from "@/lib/utils";
import { evaluateScenario, mapConsequences, mapLawReferences } from "@/domain/simulation/engine";

const DOC = `1. Payment. The Tenant shall pay Rs 25,000 within 7 days of the due date. 2. Indemnity. The Tenant shall indemnify and hold harmless the Landlord from unlimited liability at the sole discretion of the Landlord. 3. Termination. Either party may terminate with 30 days notice.`;

describe("end-to-end pure pipeline", () => {
  it("analysis → action kit → checklist stay consistent", () => {
    const analysis = analyzeClauses(segmentClauses(DOC));
    const kit = generateActionKit(analysis);
    const checklist = buildComplianceChecklist(analysis);
    expect(kit.negotiationPoints.length).toBeGreaterThan(0);
    expect(checklist.length).toBeGreaterThan(0);
    expect(checklist.some((item) => /pay/i.test(item.task))).toBe(true);
  });

  it("fallback narrative markers are splittable exactly like AI markers", () => {
    const { result } = fallbackAnalyze(DOC, "rental");
    const narrative = composeEmailDraft(result);
    expect(narrative).toContain("Subject:");
    expect(narrative.length).toBeGreaterThan(60);
  });

  it("simulation chain produces law citations and score card text", () => {
    const contract = { id: "p-1", title: "Lease", kind: "rental" as const, text: DOC, provisions: [] };
    const result = evaluateScenario(contract, "breach via non-payment");
    const consequences = mapConsequences(result);
    const refs = mapLawReferences(result);
    expect(consequences.length).toBeGreaterThan(0);
    expect(refs.length).toBeGreaterThan(0);
  });

  it("compare chain quantifies risk movement between versions", () => {
    const base = { id: "A", title: "A", kind: "rental" as const, text: DOC };
    const target = {
      id: "B",
      title: "B",
      kind: "rental" as const,
      text: DOC.replace("within 7 days", "within 2 days").replace("unlimited liability", "uncapped unlimited liability forever"),
    };
    const diff = computeSemanticDiff(base, target);
    const delta = assessRiskDelta(diff);
    expect(typeof delta.delta).toBe("number");
    expect(diff.summary.length).toBeGreaterThan(0);
  });

  it("simplification stays bounded for the reading-level dial", () => {
    const out = fallbackSimplify(DOC, 6);
    expect(out.targetLevel).toBe(6);
    expect(out.simplified.length).toBeGreaterThan(0);
  });

  it("marker split helper returns progressively growing sections", () => {
    const stream = `${ANALYSIS_MARKERS.partyA} first ${ANALYSIS_MARKERS.partyB} second`;
    expect(sectionAfter(stream, ANALYSIS_MARKERS.partyA, ANALYSIS_MARKERS.partyB)).toBe("first");
    expect(sectionAfter(stream, ANALYSIS_MARKERS.partyB, null)).toBe("second");
    expect(Object.keys(SIM_CARD_MARKERS)).toHaveLength(4);
  });
});
