import { describe, expect, it } from "vitest";

import {
  INDIAN_PROVISIONS,
  formatCitation,
  getProvision,
  provisionsForContractKind,
  provisionsForTopics,
  shortCitation,
} from "./indian-provisions";

/** The nine provisions the product brief mandates as the canonical core. */
const MANDATED_IDS = [
  "bns-318",
  "bns-316",
  "ica-10",
  "ica-73",
  "cpa-2-47",
  "rera-13",
  "ita-10a",
  "tpa-105",
  "tpa-106",
] as const;

describe("INDIAN_PROVISIONS — canonical database", () => {
  it("contains every mandated provision", () => {
    for (const id of MANDATED_IDS) {
      expect(getProvision(id), `missing provision ${id}`).not.toBeNull();
    }
  });

  it("encodes the corrected BNS mapping (318 = cheating/IPC 420, 316 = breach of trust/IPC 406)", () => {
    const cheating = getProvision("bns-318");
    const breach = getProvision("bns-316");
    expect(cheating?.title).toBe("Cheating");
    expect(cheating?.replaces).toContain("420");
    expect(breach?.title).toBe("Criminal breach of trust");
    expect(breach?.replaces).toContain("406");
  });

  it("has unique ids and fully populated entries", () => {
    const ids = INDIAN_PROVISIONS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const provision of INDIAN_PROVISIONS) {
      expect(provision.act.length).toBeGreaterThan(0);
      expect(provision.statute.length).toBeGreaterThan(0);
      expect(provision.section.length).toBeGreaterThan(0);
      expect(provision.title.length).toBeGreaterThan(0);
      expect(provision.summary.length).toBeGreaterThan(20);
      expect(provision.topics.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("getProvision", () => {
  it("returns null for unknown ids instead of throwing", () => {
    expect(getProvision("does-not-exist")).toBeNull();
    expect(getProvision("")).toBeNull();
  });
});

describe("provisionsForTopics", () => {
  it("returns nothing for an empty topic list", () => {
    expect(provisionsForTopics([])).toEqual([]);
  });

  it("ranks by topic overlap and respects the limit", () => {
    const hits = provisionsForTopics(["termination", "notice", "rental"], 3);
    expect(hits.length).toBeLessThanOrEqual(3);
    expect(hits.length).toBeGreaterThan(0);
    // TPA 106 (termination+notice+rental+lease) must outrank single-topic hits.
    expect(hits[0]?.id).toBe("tpa-106");
  });

  it("returns nothing when no topic matches", () => {
    expect(provisionsForTopics(["starship-warranty"])).toEqual([]);
  });
});

describe("provisionsForContractKind", () => {
  it("covers every contract kind with resolved provisions", () => {
    for (const kind of ["rental", "employment", "nda", "tos", "other", "unknown-kind"]) {
      const provisions = provisionsForContractKind(kind);
      expect(provisions.length, `kind ${kind}`).toBeGreaterThan(0);
    }
  });

  it("grounds rental documents in TPA lease provisions", () => {
    const ids = provisionsForContractKind("rental").map((p) => p.id);
    expect(ids).toContain("tpa-105");
    expect(ids).toContain("tpa-106");
  });

  it("grounds consumer-facing kinds in CPA 2(47)", () => {
    expect(provisionsForContractKind("tos").map((p) => p.id)).toContain("cpa-2-47");
  });
});

describe("citation formatters", () => {
  it("formats the long citation with statute, section and title", () => {
    const provision = getProvision("ica-73");
    expect(provision).not.toBeNull();
    expect(formatCitation(provision!)).toBe(
      "Indian Contract Act 1872 § 73 — Compensation for loss or damage caused by breach",
    );
  });

  it("formats the short citation as act + section", () => {
    expect(shortCitation(getProvision("rera-13")!)).toBe("RERA § 13");
  });
});
