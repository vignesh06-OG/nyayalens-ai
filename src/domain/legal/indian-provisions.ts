// ---------------------------------------------------------------------------
// NyayaLens AI — Indian statute provision lookups
// Deterministic accessors over the provision dataset in provisions-data.ts.
// Pure domain module: no secrets, no network.
// ---------------------------------------------------------------------------

import { INDIAN_PROVISIONS, type StatuteProvision } from "./provisions-data";

export { INDIAN_PROVISIONS };
export type { StatuteProvision };
/** Lookup by stable id; null when unknown (never throws). */
export function getProvision(id: string): StatuteProvision | null {
  for (const provision of INDIAN_PROVISIONS) {
    if (provision.id === id) {
      return provision;
    }
  }
  return null;
}
/** Rank provisions by topic overlap; stable order for identical scores. */
export function provisionsForTopics(
  topics: readonly string[],
  limit: number = 4,
): StatuteProvision[] {
  if (topics.length === 0) {
    return [];
  }
  const wanted = new Set(topics);
  return INDIAN_PROVISIONS.map((provision) => ({
    provision,
    score: provision.topics.filter((t) => wanted.has(t)).length,
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.provision);
}

const KIND_PROVISION_IDS: Readonly<Record<string, readonly string[]>> = {
  rental: ["tpa-105", "tpa-106", "tpa-108", "cpa-2-47", "ica-73"],
  employment: ["ica-10", "ica-37", "ica-73", "ica-74", "sra-injunctions"],
  nda: ["ica-10", "ica-73", "sra-injunctions", "bns-316"],
  tos: ["ita-10a", "cpa-2-47", "ica-10", "ica-23"],
  "real-estate": ["rera-13", "tpa-105", "cpa-2-47", "ica-73"],
};

const DEFAULT_PROVISION_IDS: readonly string[] = [
  "ica-10",
  "ica-37",
  "ica-73",
  "ita-10a",
];
/**
 * Statutory anchors relevant to a contract kind. Accepts a plain string so
 * this module stays import-free; unknown kinds get the general-contract set.
 */
export function provisionsForContractKind(kind: string): StatuteProvision[] {
  const ids = KIND_PROVISION_IDS[kind] ?? DEFAULT_PROVISION_IDS;
  const resolved: StatuteProvision[] = [];
  for (const id of ids) {
    const provision = getProvision(id);
    if (provision !== null) {
      resolved.push(provision);
    }
  }
  return resolved;
}
/** "Indian Contract Act 1872 § 73 — Compensation for loss or damage caused by breach" */
export function formatCitation(provision: StatuteProvision): string {
  return `${provision.statute} ${provision.section} — ${provision.title}`;
}
/** "ICA § 73" — the compact form used inside prompts. */
export function shortCitation(provision: StatuteProvision): string {
  return `${provision.act} ${provision.section}`;
}
