// ---------------------------------------------------------------------------
// NyayaLens AI — deterministic text segmentation
// Sentence splitting + clause segmentation for the analysis engine.
// Pure functions. No secrets, no network.
// ---------------------------------------------------------------------------

import type { Clause } from "./types";

/** Split text into sentence-ish units. Deterministic. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.;!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Segment raw legal text into clauses. Numbered headings become
 * references/titles; paragraph blocks are the unit of analysis.
 * Deterministic and dependency-free.
 */
export function segmentClauses(text: string): Clause[] {
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  const usable = blocks.length > 0 ? blocks : text.trim().length > 0 ? [text.trim()] : [];

  return usable.map((block, index) => {
    const heading = /^\s*(clause|section|article)?\s*([\d]+(?:\.[\d]+)*[.)]?|[A-Z][.)])\s+([^\n]{0,80})/i.exec(
      block,
    );
    const reference = heading?.[2] !== undefined ? `Clause ${heading[2]}` : `Clause ${index + 1}`;
    const title = (heading?.[3] ?? block.slice(0, 60)).trim();
    return {
      id: `c${index + 1}`,
      reference,
      title,
      text: block,
    };
  });
}
