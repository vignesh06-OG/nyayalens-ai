// ---------------------------------------------------------------------------
// NyayaLens AI — comparator panels
// Risk-delta indicator card and the clause-level diff rows (pure presentation).
// ---------------------------------------------------------------------------

"use client";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

import type { ChangeKind, DiffResult, RiskDelta } from "@/domain/comparison/types";

export const changeTone: Record<ChangeKind, { chip: "emerald" | "rose" | "amber" | "slate"; row: string; label: string }> = {
  added: { chip: "emerald", row: "border-l-emerald-400 bg-emerald-500/5", label: "Added" },
  removed: { chip: "rose", row: "border-l-rose-400 bg-rose-500/5", label: "Removed" },
  modified: { chip: "amber", row: "border-l-amber-400 bg-amber-500/5", label: "Modified" },
  unchanged: { chip: "slate", row: "border-l-slate-500 bg-white/[0.02]", label: "Unchanged" },
};

/** Blue risk-delta indicator with per-slot movement notes. */
export function RiskDeltaCard({
  delta,
  deltaLabel,
  riskDelta,
}: {
  delta: number;
  deltaLabel: string;
  riskDelta: RiskDelta;
}) {
  return (
    <Card accent="blue" className="items-center gap-2" padding="lg">
      <h3 className="text-base font-semibold text-blue-100">Risk Delta</h3>
      <p
        role="status"
        className={cn(
          "text-5xl font-bold tabular-nums",
          delta >= 5 ? "text-rose-300" : delta <= -5 ? "text-emerald-300" : "text-blue-200",
        )}
      >
        {delta > 0 ? "+" : ""}
        {delta.toFixed(2)}
      </p>
      <p className="text-sm text-slate-300">{deltaLabel}</p>
      <p className="text-xs text-slate-500">
        Aggregate risk moved {riskDelta.baseScore} → {riskDelta.targetScore}
      </p>
      {riskDelta.movements.length > 0 ? (
        <ul className="mt-2 flex w-full flex-col gap-1.5 border-t border-white/10 pt-3">
          {riskDelta.movements.slice(0, 4).map((m) => (
            <li key={m.slot} className="flex items-start gap-2 text-sm text-slate-300">
              <Badge tone="slate" className="shrink-0 !px-2 !py-0.5 !text-[10px]">{m.slot}</Badge>
              {m.note}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

/** Clause diff rows with add/remove/modify color coding and expandable text. */
export function DiffRowsCard({ diff }: { diff: DiffResult }) {
  return (
    <Card className="gap-3" padding="lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-100">Clause Diff</h3>
        <div className="flex items-center gap-2 text-xs">
          <Badge tone="emerald">+{diff.addedCount} added</Badge>
          <Badge tone="rose">−{diff.removedCount} removed</Badge>
          <Badge tone="amber">~{diff.modifiedCount} modified</Badge>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {diff.diffs.map((item) => {
          const tone = changeTone[item.changeKind];
          return (
            <li key={item.slot} className={cn("rounded-r-lg border-l-4 px-4 py-3", tone.row)}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={tone.chip}>{tone.label}</Badge>
                <span className="font-mono text-xs text-slate-400">{item.slot}</span>
                <span className="text-xs text-slate-500">
                  similarity {Math.round(item.similarity * 100)}%
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300">{item.summary}</p>
              {item.baseText !== null || item.targetText !== null ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-blue-300 hover:text-blue-200">
                    View clause text
                  </summary>
                  <div className="mt-2 flex flex-col gap-2">
                    {item.baseText !== null ? (
                      <p className="whitespace-pre-wrap rounded-lg bg-white/5 p-3 text-xs text-slate-400">
                        <strong className="text-slate-300">A:</strong> {item.baseText}
                      </p>
                    ) : null}
                    {item.targetText !== null ? (
                      <p className="whitespace-pre-wrap rounded-lg bg-white/5 p-3 text-xs text-slate-400">
                        <strong className="text-slate-300">B:</strong> {item.targetText}
                      </p>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
