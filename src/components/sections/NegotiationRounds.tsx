"use client";

import { Landmark, Scale, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { NegotiationRound, Stance } from "@/domain/negotiation/types";
import { cn } from "@/lib/utils";

const STANCE_TONE: Record<Stance, "rose" | "amber" | "emerald" | "blue"> = {
  aggressive: "rose",
  firm: "amber",
  conciliatory: "blue",
  settled: "emerald",
};

/** Horizontal convergence meter (color is never the only indicator — the number is printed). */
export function ConvergenceMeter({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-white/10"
    >
      <div
        className={cn(
          "h-full rounded-full",
          value >= 80 ? "bg-emerald-400" : value >= 50 ? "bg-amber-400" : "bg-rose-400",
        )}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function CitationBadges({ citations }: { citations: readonly string[] }) {
  if (citations.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {citations.map((citation) => (
        <Badge key={citation} tone="slate">
          {citation}
        </Badge>
      ))}
    </div>
  );
}

function Concessions({ concessions }: { concessions: readonly string[] }) {
  if (concessions.length === 0) {
    return null;
  }
  return (
    <>
      {concessions.map((concession) => (
        <p key={concession} className="text-xs text-emerald-300">
          conceded: {concession}
        </p>
      ))}
    </>
  );
}

/**
 * The three-round negotiation timeline: Party A (drafter-side), Party B
 * (user-side), and the Mediator per round, with stance badges, concessions,
 * statutory citations, and a convergence meter.
 */
export function NegotiationRounds({ rounds }: { rounds: readonly NegotiationRound[] }) {
  return (
    <>
      {rounds.map((round) => (
        <Card key={round.round} className="gap-4" padding="lg">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-100">Round {round.round}</h3>
              <span className="text-xs tabular-nums text-slate-400">
                convergence {round.mediator.convergence}/100
              </span>
            </div>
            <ConvergenceMeter value={round.mediator.convergence} label={`Round ${round.round} convergence`} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2 rounded-xl border border-rose-400/20 bg-rose-500/5 p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-rose-100">
                <Landmark className="h-4 w-4" aria-hidden="true" /> Party A
                <Badge tone={STANCE_TONE[round.partyA.stance]}>{round.partyA.stance}</Badge>
              </h4>
              <p className="text-sm leading-relaxed text-rose-100/90">{round.partyA.position}</p>
              <Concessions concessions={round.partyA.concessions} />
              <CitationBadges citations={round.partyA.citations} />
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-blue-400/20 bg-blue-500/5 p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-100">
                <UserRound className="h-4 w-4" aria-hidden="true" /> Party B (you)
                <Badge tone={STANCE_TONE[round.partyB.stance]}>{round.partyB.stance}</Badge>
              </h4>
              <p className="text-sm leading-relaxed text-blue-100/90">{round.partyB.position}</p>
              <Concessions concessions={round.partyB.concessions} />
              <CitationBadges citations={round.partyB.citations} />
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                <Scale className="h-4 w-4" aria-hidden="true" /> Mediator
              </h4>
              <p className="text-sm leading-relaxed text-amber-100/90">{round.mediator.gapSummary}</p>
              <p className="text-sm leading-relaxed text-amber-200/80">Bridge: {round.mediator.suggestion}</p>
              <CitationBadges citations={round.mediator.citations} />
            </div>
          </div>
        </Card>
      ))}
    </>
  );
}
