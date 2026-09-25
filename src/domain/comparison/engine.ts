import { assessClauseRisk, computeRiskScore, levelForScore, segmentClauses } from "../analysis/engine";
import type { Clause, RiskAssessment, RiskLevel } from "../analysis/types";
import type { ChangeKind, ClauseDiff, DiffResult, Document, RiskDelta, RiskMovement } from "./types";

/* ------------------------------------------------------------------ */
/* Pure similarity helpers                                             */
/* ------------------------------------------------------------------ */

const STOPWORDS: ReadonlySet<string> = new Set([
  "the", "and", "for", "that", "this", "with", "shall", "will", "party", "parties",
  "agreement", "from", "have", "been", "are", "was", "were", "its", "not", "any",
]);

function termFrequencies(text: string): Map<string, number> {
  const words = (text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []).filter(
    (w) => !STOPWORDS.has(w),
  );
  const freqs = new Map<string, number>();
  for (const word of words) {
    freqs.set(word, (freqs.get(word) ?? 0) + 1);
  }
  return freqs;
}

/** Cosine similarity of bag-of-words term frequencies. 0..1 */
function similarity(a: string, b: string): number {
  const fa = termFrequencies(a);
  const fb = termFrequencies(b);
  if (fa.size === 0 || fb.size === 0) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [, weight] of fa) {
    normA += weight * weight;
  }
  for (const [, weight] of fb) {
    normB += weight * weight;
  }
  for (const [term, weight] of fa) {
    const other = fb.get(term);
    if (other !== undefined) {
      dot += weight * other;
    }
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : Math.round((dot / denominator) * 1000) / 1000;
}

const PAIR_THRESHOLD = 0.45;
const IDENTICAL_THRESHOLD = 0.92;

/* ------------------------------------------------------------------ */
/* Engine 05 — pure functions                                          */
/* ------------------------------------------------------------------ */

/**
 * Clause-level semantic diff: aligns clause slots across two documents by
 * lexical-semantic similarity, then classifies every slot.
 */
export function computeSemanticDiff(docA: Document, docB: Document): DiffResult {
  const baseClauses = segmentClauses(docA.text);
  const targetClauses = segmentClauses(docB.text);

  const matchedTarget = new Set<string>();
  const diffs: ClauseDiff[] = [];
  const pairedBase = new Set<string>();

  baseClauses.forEach((base, index) => {
    let best: Clause | null = null;
    let bestScore = 0;
    for (const candidate of targetClauses) {
      if (matchedTarget.has(candidate.id)) {
        continue;
      }
      const score = similarity(base.text, candidate.text);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    if (best !== null && bestScore >= PAIR_THRESHOLD) {
      matchedTarget.add(best.id);
      pairedBase.add(base.id);
      const changeKind: ChangeKind = bestScore >= IDENTICAL_THRESHOLD ? "unchanged" : "modified";
      const percentMoved = Math.round((1 - bestScore) * 100);
      diffs.push({
        slot: `c${index + 1}`,
        changeKind,
        baseText: base.text,
        targetText: best.text,
        similarity: bestScore,
        summary:
          changeKind === "unchanged"
            ? "Unchanged"
            : `~${percentMoved}% of the wording moved between versions`,
      });
    }
  });

  baseClauses.forEach((base, index) => {
    if (!pairedBase.has(base.id)) {
      diffs.push({
        slot: `c${index + 1}`,
        changeKind: "removed",
        baseText: base.text,
        targetText: null,
        similarity: 0,
        summary: `Present only in ${docA.title.length > 0 ? docA.title : "version A"}`,
      });
    }
  });

  targetClauses.forEach((target, index) => {
    if (!matchedTarget.has(target.id)) {
      diffs.push({
        slot: `c+${index + 1}`,
        changeKind: "added",
        baseText: null,
        targetText: target.text,
        similarity: 0,
        summary: `Present only in ${docB.title.length > 0 ? docB.title : "version B"}`,
      });
    }
  });

  diffs.sort((a, b) => a.slot.localeCompare(b.slot, undefined, { numeric: true }));

  const addedCount = diffs.filter((d) => d.changeKind === "added").length;
  const removedCount = diffs.filter((d) => d.changeKind === "removed").length;
  const modifiedCount = diffs.filter((d) => d.changeKind === "modified").length;

  return {
    baseDocumentId: docA.id,
    targetDocumentId: docB.id,
    diffs,
    addedCount,
    removedCount,
    modifiedCount,
    summary: `${addedCount} added, ${removedCount} removed, ${modifiedCount} modified across ${diffs.length} clause slots.`,
  };
}

function assessmentFor(slot: string, text: string | null): RiskAssessment {
  const clause: Clause = {
    id: slot,
    reference: slot,
    title: slot,
    text: text ?? "",
  };
  return assessClauseRisk(clause);
}

/** Quantify how the risk profile moved between the two versions. */
export function assessRiskDelta(diff: DiffResult): RiskDelta {
  const baseAssessments: RiskAssessment[] = [];
  const targetAssessments: RiskAssessment[] = [];
  const movements: RiskMovement[] = [];

  for (const item of diff.diffs) {
    const base = assessmentFor(item.slot, item.baseText);
    const target = assessmentFor(item.slot, item.targetText);

    if (item.baseText !== null) {
      baseAssessments.push(base);
    }
    if (item.targetText !== null) {
      targetAssessments.push(target);
    }

    if (item.changeKind === "unchanged") {
      continue;
    }

    const before: RiskLevel = item.baseText !== null ? base.riskLevel : "low";
    const after: RiskLevel = item.targetText !== null ? target.riskLevel : "low";
    const scoreShift = target.score - base.score;

    if (Math.abs(scoreShift) < 10 && before === after && item.changeKind === "modified") {
      continue;
    }

    movements.push({
      slot: item.slot,
      before,
      after,
      note: movementNote(item.changeKind, before, after),
    });
  }

  const baseScore = computeRiskScore(baseAssessments);
  const targetScore = computeRiskScore(targetAssessments);

  return {
    delta: Math.round((targetScore - baseScore) * 100) / 100,
    baseScore,
    targetScore,
    movements,
  };
}

function movementNote(changeKind: ChangeKind, before: RiskLevel, after: RiskLevel): string {
  if (changeKind === "added") {
    return `New clause in the target — exposure level ${after}`;
  }
  if (changeKind === "removed") {
    return `Clause deleted from the base — ${before} exposure removed`;
  }
  return `Risk moved from ${before} to ${after}`;
}

export function riskLevelForScore(score: number): RiskLevel {
  return levelForScore(score);
}
