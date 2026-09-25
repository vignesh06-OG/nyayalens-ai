"use client";

import { useCallback, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useChat } from "ai/react";
import { AlertTriangle, BookOpen, Gavel, Send, Target, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SIM_CARD_MARKERS } from "@/lib/ai/prompts";
import { cn, sectionAfter } from "@/lib/utils";

export interface ScenarioSimulatorSectionProps {
  /** Contract registry id produced by adversarial analysis. */
  contractId: string | null;
  contractTitle?: string;
}

const SCENARIO_CHIPS = [
  "Early termination",
  "Non-payment",
  "Breach of Clause X",
  "Force majeure",
] as const;

interface ParsedCards {
  consequences: string;
  law: string;
  action: string;
  scoreText: string;
  score: number | null;
}

function parseCards(content: string): ParsedCards {
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
function RiskGauge({ score, label }: { score: number; label: string }) {
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

/**
 * SECTION 2 — What-If Scenario Simulator.
 * Scenario chips + free text; the response streams into four structured
 * cards (⚠️ consequences · 📜 law · 🎯 actions · 📊 risk gauge) via useChat.
 */
export default function ScenarioSimulatorSection({
  contractId,
  contractTitle,
}: ScenarioSimulatorSectionProps) {
  const [draft, setDraft] = useState("");

  const { messages, append, isLoading, error, reload, stop } = useChat({
    api: "/api/completion",
    streamProtocol: "text",
    body: { mode: "simulate", contractId: contractId ?? undefined },
  });

  const ask = useCallback(
    (scenario: string) => {
      const trimmed = scenario.trim();
      if (trimmed.length < 5 || contractId === null) {
        return;
      }
      void append({ role: "user", content: trimmed });
    },
    [append, contractId],
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask(draft);
    setDraft("");
  };

  const exchanges = useMemo(() => {
    const rows: Array<{ id: string; question: string; answer: string }> = [];
    for (const message of messages) {
      if (message.role === "user") {
        rows.push({ id: message.id, question: message.content, answer: "" });
      } else {
        const last = rows[rows.length - 1];
        if (last !== undefined) {
          last.answer = message.content;
        } else {
          rows.push({ id: message.id, question: "", answer: message.content });
        }
      }
    }
    return rows;
  }, [messages]);

  return (
    <section id="simulate" className="relative mx-auto w-full max-w-6xl px-6 py-24">
      <SectionHeader
        eyebrow="Engine 02 · What-If Simulator"
        title={
          <>
            Branch the future <span className="text-bc">before it branches you</span>
          </>
        }
        description={
          contractId !== null
            ? `Running scenarios against ${contractTitle ?? "your analyzed contract"}. Each answer lands as four cards — consequences, law, actions, risk.`
            : "Feed a scenario in and watch the consequence chain, governing law, and risk score assemble in real time."
        }
      />

      <div className="mt-12 flex flex-col gap-6">
        {contractId === null ? (
          <EmptyState
            icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
            title="Simulate against a real contract"
            description="The simulator needs a contract on file. Run Adversarial Analysis first — the same document is then registered for scenario runs."
            action={<Button href="#analyze">Go to Adversarial Analysis</Button>}
          />
        ) : null}

        {/* Scenario composer */}
        <Card className="gap-4" padding="lg">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Pre-built scenario chips">
            {SCENARIO_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => ask(chip)}
                disabled={isLoading || contractId === null}
                aria-label={`Run scenario: ${chip}`}
                className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-slate-300 transition-all hover:border-blue-400/50 hover:bg-blue-500/10 hover:text-blue-200 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>
          <form onSubmit={onSubmit} className="flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="scenario-input" className="sr-only">
                Describe a custom scenario
              </label>
              <textarea
                id="scenario-input"
                value={draft}
                rows={2}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="e.g. tenant stops paying after a repair dispute and landlord threatens lock-out"
                disabled={isLoading || contractId === null}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
              />
            </div>
            {isLoading ? (
              <Button variant="secondary" onClick={stop} aria-label="Stop generating">
                Stop
              </Button>
            ) : (
              <Button type="submit" disabled={draft.trim().length < 5 || contractId === null} aria-label="Run custom scenario">
                <Send className="h-4 w-4" aria-hidden="true" />
                Run
              </Button>
            )}
          </form>
        </Card>

        {error !== undefined && error !== null ? (
          <ErrorState
            title="Scenario run failed"
            message={error.message ?? "The simulation could not complete."}
            onRetry={() => void reload()}
          />
        ) : null}

        {/* Scenario feed */}
        {exchanges.length === 0 && contractId !== null ? (
          <EmptyState
            icon={<Target className="h-5 w-5" aria-hidden="true" />}
            title="Pick a scenario above"
            description="Try a chip like “Early termination”, or type your own what-if. Answers stream into consequence, law, action, and risk cards."
          />
        ) : null}

        <div className="flex flex-col gap-8" aria-live="polite">
          {exchanges.map((exchange) => {
            const cards = parseCards(exchange.answer);
            const answered = exchange.answer.length > 0;
            return (
              <article key={exchange.id} className="flex flex-col gap-4">
                <h3 className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200">
                  Scenario: {exchange.question}
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* ⚠️ Consequences */}
                  <Card accent="rose" className={cn("gap-3", isLoading && !answered && "magic-border")}>
                    <h4 className="flex items-center gap-2 text-base font-semibold text-rose-100">
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Consequences
                    </h4>
                    {cards.consequences.length > 0 ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-rose-100/90">{cards.consequences}</p>
                    ) : isLoading ? (
                      <SkeletonText lines={3} />
                    ) : (
                      <p className="text-sm text-slate-500">No consequences section streamed.</p>
                    )}
                  </Card>

                  {/* 📜 Relevant Law */}
                  <Card accent="blue" className="gap-3">
                    <h4 className="flex items-center gap-2 text-base font-semibold text-blue-100">
                      <BookOpen className="h-4 w-4" aria-hidden="true" /> Relevant Law
                    </h4>
                    {cards.law.length > 0 ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-blue-100/90">{cards.law}</p>
                    ) : isLoading ? (
                      <SkeletonText lines={3} />
                    ) : (
                      <p className="text-sm text-slate-500">No law section streamed.</p>
                    )}
                  </Card>

                  {/* 🎯 Recommended Action */}
                  <Card accent="emerald" className="gap-3">
                    <h4 className="flex items-center gap-2 text-base font-semibold text-emerald-100">
                      <Target className="h-4 w-4" aria-hidden="true" /> Recommended Action
                    </h4>
                    {cards.action.length > 0 ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-emerald-100/90">{cards.action}</p>
                    ) : isLoading ? (
                      <SkeletonText lines={3} />
                    ) : (
                      <p className="text-sm text-slate-500">No action section streamed.</p>
                    )}
                  </Card>

                  {/* 📊 Risk Score gauge */}
                  <Card accent="cyan" className="items-center justify-center gap-3">
                    <h4 className="flex items-center gap-2 text-base font-semibold text-cyan-100">
                      <TrendingUp className="h-4 w-4" aria-hidden="true" /> Risk Score
                    </h4>
                    {cards.score !== null ? (
                      <>
                        <RiskGauge score={cards.score} label="Scenario risk" />
                        <p className="text-center text-sm text-slate-300">{cards.scoreText}</p>
                      </>
                    ) : isLoading ? (
                      <>
                        <Skeleton className="h-28 w-28 rounded-full" />
                        <SkeletonText lines={1} className="w-32" />
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">No score streamed.</p>
                    )}
                  </Card>
                </div>
              </article>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <Gavel className="h-4 w-4 animate-glow-pulse text-blue-300" aria-hidden="true" />
            Simulating scenario — cards fill as the stream arrives…
          </div>
        ) : null}
      </div>
    </section>
  );
}
