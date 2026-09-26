// ---------------------------------------------------------------------------
// NyayaLens AI — adversarial analysis panels
// Pure presentation pieces for the analysis workbench: dual-perspective
// cards, risk heatmap, obligation timeline, and the obligation detail dialog.
// ---------------------------------------------------------------------------

"use client";

import { ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonText } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

import type { Clause, Obligation, RiskDimension } from "@/domain/analysis/types";

export function barClass(score: number): string {
  if (score < 40) {
    return "bg-emerald-400";
  }
  if (score < 70) {
    return "bg-amber-400";
  }
  return "bg-rose-400";
}

export const PARTY_TONE: Record<Obligation["party"], "blue" | "amber" | "slate"> = {
  "party-a": "blue",
  "party-b": "amber",
  both: "slate",
};

/** Split-screen dual perspectives, streamed word-by-word. */
export function PerspectiveCards({
  partyA,
  partyB,
  streaming,
}: {
  partyA: string;
  partyB: string;
  streaming: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card accent="blue" className={cn("gap-3", streaming && "magic-border bg-slate-950/60")}>
        <div className="flex items-center gap-2">
          <Badge tone="blue" dot>
            Party A
          </Badge>
          <h3 className="text-base font-semibold text-blue-100">Party A Perspective</h3>
        </div>
        {partyA.length > 0 ? (
          <p className={cn("whitespace-pre-wrap text-sm leading-relaxed text-blue-100/90", streaming && partyB.length === 0 && "stream-caret")}>
            {partyA}
          </p>
        ) : (
          <SkeletonText lines={4} />
        )}
      </Card>
      <Card accent="amber" className={cn("gap-3", streaming && "magic-border bg-slate-950/60")}>
        <div className="flex items-center gap-2">
          <Badge tone="amber" dot>
            Party B
          </Badge>
          <h3 className="text-base font-semibold text-amber-100">Party B Perspective</h3>
        </div>
        {partyB.length > 0 ? (
          <p className={cn("whitespace-pre-wrap text-sm leading-relaxed text-amber-100/90", streaming && "stream-caret")}>
            {partyB}
          </p>
        ) : (
          <SkeletonText lines={4} />
        )}
      </Card>
    </div>
  );
}

/** Risk heatmap — color-coded bars over the five risk dimensions. */
export function RiskHeatmapCard({
  rows,
}: {
  rows: { dimension: RiskDimension; score: number }[];
}) {
  return (
    <Card className="gap-5" padding="lg">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-slate-100">Risk Heatmap</h3>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> 0–39</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> 40–69</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" /> 70–100</span>
        </div>
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.dimension} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3">
            <span className="text-sm capitalize text-slate-300">{row.dimension}</span>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                role="meter"
                aria-label={`${row.dimension} risk`}
                aria-valuenow={row.score}
                aria-valuemin={0}
                aria-valuemax={100}
                className={cn("h-full rounded-full transition-all duration-700", barClass(row.score))}
                style={{ width: `${Math.max(3, row.score)}%` }}
              />
            </div>
            <span className="text-right text-sm tabular-nums text-slate-300">{row.score}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Obligation timeline — horizontal, party-colored, click for details. */
export function ObligationTimelineCard({
  obligations,
  onSelect,
}: {
  obligations: Obligation[];
  onSelect: (obligation: Obligation) => void;
}) {
  return (
    <Card className="gap-5" padding="lg">
      <h3 className="text-base font-semibold text-slate-100">Obligation Timeline</h3>
      {obligations.length > 0 ? (
        <ol className="flex gap-0 overflow-x-auto pb-2">
          {obligations.slice(0, 8).map((obligation, index) => (
            <li
              key={obligation.id}
              className={cn("rise flex min-w-[15rem] flex-1 flex-col items-center gap-2 px-2")}
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div className="flex w-full items-center">
                <span className="timeline-line" aria-hidden="true" />
                <span
                  className={cn(
                    "timeline-dot ring-2 ring-slate-950",
                    obligation.party === "party-a"
                      ? "bg-blue-400"
                      : obligation.party === "party-b"
                        ? "bg-amber-400"
                        : "bg-slate-300",
                  )}
                  aria-hidden="true"
                />
                <span className="timeline-line" aria-hidden="true" />
              </div>
              <button
                type="button"
                onClick={() => onSelect(obligation)}
                aria-label={`Open obligation details: ${obligation.action.slice(0, 60)}`}
                className="glass w-full px-3 py-2.5 text-left transition-all hover:border-blue-400/40 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <Badge tone={PARTY_TONE[obligation.party]} className="mb-1 !px-2 !py-0.5 !text-[10px]">
                  {obligation.party === "party-a" ? "Party A" : obligation.party === "party-b" ? "Party B" : "Both"}
                </Badge>
                <p className="line-clamp-2 text-xs leading-relaxed text-slate-300">{obligation.action}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {obligation.deadline ?? obligation.trigger ?? "No deadline stated"}
                </p>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          icon={<ScrollText className="h-5 w-5" aria-hidden="true" />}
          title="No obligations detected"
          description="The rule engine found no 'shall/must' duties in this text — unusual for a real contract. Try a richer excerpt."
        />
      )}
    </Card>
  );
}

/** Detail dialog for the selected obligation + its source clause. */
export function ObligationDetailDialog({
  selected,
  clause,
  onClose,
}: {
  selected: Obligation | null;
  clause: Clause | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={selected !== null}
      onClose={onClose}
      title={selected !== null ? (clause?.reference ?? "Obligation") : "Obligation"}
    >
      {selected !== null ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={PARTY_TONE[selected.party]} dot>
              {selected.party === "party-a" ? "Party A" : selected.party === "party-b" ? "Party B" : "Both parties"}
            </Badge>
            <Badge tone={selected.deadline !== null ? "amber" : "slate"}>
              {selected.deadline ?? selected.trigger ?? "No deadline stated"}
            </Badge>
          </div>
          <p className="text-sm leading-relaxed text-slate-300">{selected.action}</p>
          {clause !== null ? (
            <div className="glass gap-2 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Source clause</p>
              <p className="text-sm text-slate-200">{clause.title}</p>
              <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-400">
                {clause.text}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}
