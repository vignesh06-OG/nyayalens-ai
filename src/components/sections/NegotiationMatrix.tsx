"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useCompletion } from "ai/react";
import { Download, Gavel, Handshake, Scale } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { NegotiationResult } from "@/domain/negotiation/types";
import { NEGOTIATION_MARKERS } from "@/lib/ai/prompts";
import { cn, sectionAfter } from "@/lib/utils";

import type { AnalysisSectionResult } from "./AdversarialAnalysis";
import { ConvergenceMeter, NegotiationRounds } from "./NegotiationRounds";

export interface NegotiationSectionProps {
  /** Output of Adversarial Analysis — negotiation runs against its registered contract. */
  analysis: AnalysisSectionResult | null;
}

type Phase = "idle" | "negotiating" | "error" | "done";

type NegotiatePayload = NegotiationResult & {
  redlineDocument: string;
  degraded: boolean;
  message: string | null;
};

const GOAL_CHIPS = [
  "Reduce the deposit to one month",
  "Shorten the notice period to 30 days",
  "Cap the late-payment penalty",
  "Allow early termination without payout",
] as const;

/**
 * SECTION 6 — Multi-Agent Negotiation. Three rounds of Party A (drafter-side)
 * vs Party B (user-side) with a Mediator bridging the gap, grounded in the
 * canonical Indian-provisions DB. Structured rounds come from POST
 * /api/negotiate; the verdict transcript streams via /api/completion.
 */
export default function NegotiationSection({ analysis }: NegotiationSectionProps) {
  const [goal, setGoal] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<NegotiatePayload | null>(null);

  const {
    completion,
    complete,
    isLoading: streaming,
    setCompletion,
  } = useCompletion({
    api: "/api/completion",
    streamProtocol: "text",
    body: { mode: "negotiate", contractId: analysis?.contractId },
  });

  const verdict = sectionAfter(completion, NEGOTIATION_MARKERS.verdict, null);

  const negotiate = useCallback(
    async (rawGoal: string) => {
      const trimmed = rawGoal.trim();
      if (trimmed.length < 5 || analysis === null) {
        return;
      }
      setPhase("negotiating");
      setError(null);
      setPayload(null);
      setCompletion("");
      try {
        const res = await fetch("/api/negotiate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contractId: analysis.contractId, userGoal: trimmed }),
        });
        const body: unknown = await res.json();
        const record = (body ?? {}) as { ok?: boolean; error?: string; data?: NegotiatePayload };
        if (!res.ok || record.ok !== true || record.data === undefined) {
          throw new Error(record.error ?? "Negotiation failed");
        }
        setPayload(record.data);
        await complete(trimmed);
        setPhase("done");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Negotiation failed");
        setPhase("error");
      }
    },
    [analysis, complete, setCompletion],
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void negotiate(goal);
    setGoal("");
  };

  const downloadRedline = useCallback(() => {
    if (payload === null) {
      return;
    }
    const blob = new Blob([payload.redlineDocument], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nyayalens-negotiation-redline.txt";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Negotiation redline downloaded.");
  }, [payload]);

  return (
    <section id="negotiate" className="relative mx-auto w-full max-w-6xl px-6 py-24">
      <SectionHeader
        eyebrow="Engine 06 · Multi-Agent Negotiation"
        title={
          <>
            Let three AI agents <span className="text-bc">fight for the redline</span>
          </>
        }
        description={
          analysis !== null
            ? "Party A defends the draft, Party B pushes your goal, the Mediator bridges — three rounds, Indian-law-grounded, ending in a downloadable redline."
            : "Run Adversarial Analysis first; the negotiation agents then debate your actual contract for three rounds and export the settled redline."
        }
      />

      <div className="mt-12 flex flex-col gap-6">
        {analysis === null ? (
          <EmptyState
            icon={<Handshake className="h-5 w-5" aria-hidden="true" />
            }
            title="No contract on the table yet"
            description="The agents negotiate a registered contract. Run Adversarial Analysis first — then state your goal and watch the rounds unfold."
            action={<Button href="#analyze">Run Adversarial Analysis</Button>}
          />
        ) : (
          <Card className="gap-4" padding="lg">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Pre-built negotiation goals">
              {GOAL_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => void negotiate(chip)}
                  disabled={phase === "negotiating"}
                  aria-label={`Negotiate: ${chip}`}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-slate-300 transition-all hover:border-amber-400/50 hover:bg-amber-500/10 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>
            <form onSubmit={onSubmit} className="flex items-end gap-3">
              <div className="flex-1">
                <label htmlFor="negotiation-goal" className="sr-only">
                  Describe your negotiation goal
                </label>
                <textarea
                  id="negotiation-goal"
                  value={goal}
                  rows={2}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder='e.g. "Reduce the deposit to one month and add a 30-day refund deadline"'
                  disabled={phase === "negotiating"}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-500/25"
                />
              </div>
              <Button type="submit" disabled={goal.trim().length < 5 || phase === "negotiating"} aria-label="Run the three-round negotiation">
                <Scale className="h-4 w-4" aria-hidden="true" />
                Negotiate
              </Button>
            </form>
          </Card>
        )}

        {error !== null ? (
          <ErrorState
            title="Negotiation failed"
            message={error}
            onRetry={() => void negotiate(GOAL_CHIPS[0])}
          />
        ) : null}

        {phase === "negotiating" && payload === null ? (
          <Card className="gap-3" padding="lg">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <Gavel className="h-4 w-4 animate-glow-pulse text-amber-300" aria-hidden="true" />
              Agents are taking positions — rounds assemble as the negotiation runs…
            </div>
            <Skeleton className="h-40 w-full" />
            <SkeletonText lines={3} />
          </Card>
        ) : null}

        {payload !== null ? (
          <div className="flex flex-col gap-6" aria-live="polite">
            {payload.degraded ? (
              <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200" role="status">
                {payload.message ?? "Rule-based negotiation — the AI layer is temporarily unavailable."}
              </p>
            ) : null}

            <NegotiationRounds rounds={payload.rounds} />

            <Card className="gap-3" padding="lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-100">Final redlines</h3>
                <Button variant="secondary" size="sm" onClick={downloadRedline} aria-label="Download the negotiation redline as a text file">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Redline (.txt)
                </Button>
              </div>
              {payload.finalRedlines.map((item) => (
                <div key={item.id} className="flex flex-col gap-2 border-l-2 border-emerald-400/60 pl-4">
                  <p className="text-sm font-medium text-slate-200">
                    [{item.clauseReference}] {item.issue}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-emerald-100/90">{item.proposedText}</p>
                  <p className="text-xs text-slate-400">{item.rationale}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.citations.map((c) => (
                      <Badge key={c} tone="blue">{c}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </Card>

            <Card className={cn("gap-3", streaming && "magic-border bg-slate-950/60")} padding="lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-slate-100">Mediator verdict</h3>
                <span className="text-sm tabular-nums text-emerald-300">
                  agreement {payload.agreementScore}/100
                </span>
              </div>
              <ConvergenceMeter value={payload.agreementScore} label="Overall agreement score" />
              {verdict.length > 0 ? (
                <p className={cn("whitespace-pre-wrap text-sm leading-relaxed text-slate-200", streaming && "stream-caret")}>
                  {verdict}
                </p>
              ) : streaming ? (
                <SkeletonText lines={3} />
              ) : (
                <p className="text-sm leading-relaxed text-slate-300">{payload.finalSummary}</p>
              )}
              <div className="flex flex-wrap gap-2" aria-label="Statutes cited across the negotiation">
                {payload.statutoryBasis.map((citation) => (
                  <Badge key={citation} tone="amber">{citation}</Badge>
                ))}
              </div>
            </Card>
          </div>
        ) : null}

        {phase === "idle" && analysis !== null ? (
          <EmptyState
            icon={<Scale className="h-5 w-5" aria-hidden="true" />
            }
            title="State your goal — the agents take it from there"
            description="Pick a chip or type your ask. Three rounds run automatically: opening positions, concession trades, and final terms with statute-backed redlines you can download."
          />
        ) : null}
      </div>
    </section>
  );
}
