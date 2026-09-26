// ---------------------------------------------------------------------------
// NyayaLens AI — scenario simulator panels
// Pre-built scenario chips, response parsing, and the conic-gradient risk gauge.
// ---------------------------------------------------------------------------

import type { CSSProperties } from "react";

import { SIM_CARD_MARKERS } from "@/lib/ai/prompts";
import { sectionAfter } from "@/lib/utils";

export const SCENARIO_CHIPS = [
  "Early termination",
  "Non-payment",
  "Breach of Clause X",
  "Force majeure",
] as const;

export interface ParsedCards {
  consequences: string;
  law: string;
  action: string;
  scoreText: string;
  score: number | null;
}

export function parseCards(content: string): ParsedCards {
  const scoreText = sectionAfter(content, SIM_CARD_MARKERS.score, null);
  const match = /\b(\d{1,3})\s*\/\s*100/.exec(scoreText);
  const raw = match?.[1];
  const parsed = raw !== undefined ? Number.parseInt(raw, 10) : Number.NaN;
  return {
    consequences: sectionAfter(content, SIM_CARD_MARKERS.consequences, SIM_CARD_MARKERS.law),
    law: sectionAfter(content, SIM_CARD_MARKERS.law, SIM_CARD_MARKERS.action),
    action: sectionAfter(content, SIM_CARD_MARKERS.action, SIM_CARD_MARKERS.score),
    scoreText,
    score: Number.isFinite(parsed) ? parsed : null,
  };
}

function gaugeColor(score: number): string {
  if (score >= 70) {
    return "#fb7185"; /* rose-400 */
  }
  if (score >= 40) {
    return "#fbbf24"; /* amber-400 */
  }
  return "#34d399"; /* emerald-400 */
}

/** CSS conic-gradient risk gauge (no chart library). */
export function RiskGauge({ score, label }: { score: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        className="risk-gauge relative h-28 w-28 rounded-full"
        style={{ ["--gauge-pct"]: String(score), ["--gauge-color"]: gaugeColor(score) } as CSSProperties}
      >
        <div className="absolute inset-[10px] flex items-center justify-center rounded-full bg-slate-950/95">
          <span className="text-2xl font-bold tabular-nums text-slate-100">{score}</span>
        </div>
      </div>
      <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</span>
    </div>
  );
}
