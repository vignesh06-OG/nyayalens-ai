"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCompletion } from "ai/react";
import { Scale, ScrollText } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FileUpload, extractText } from "@/components/ui/FileUpload";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  RISK_DIMENSIONS,
  type AnalysisResult,
  type Obligation,
} from "@/domain/analysis/types";
import type { ContractKind } from "@/domain/simulation/types";
import { ANALYSIS_MARKERS } from "@/lib/ai/prompts";
import { cn, sectionAfter } from "@/lib/utils";

export interface AnalysisSectionResult extends AnalysisResult {
  contractId: string;
  narrative: string;
  partyA: string;
  partyB: string;
  degraded: boolean;
  message: string | null;
}

export interface AdversarialAnalysisSectionProps {
  /** Pre-seeded document text (skips the upload step when provided). */
  initialText?: string;
  documentType?: ContractKind;
  /** Lifts the finished analysis so dependent sections (Action Kit) can build on it. */
  onAnalysisComplete?: (result: AnalysisSectionResult) => void;
}

type Phase = "idle" | "analyzing" | "error" | "done";

type AnalysisPayload = AnalysisResult & {
  contractId: string;
  degraded: boolean;
  message: string | null;
};

function barClass(score: number): string {
  if (score < 40) {
    return "bg-emerald-400";
  }
  if (score < 70) {
    return "bg-amber-400";
  }
  return "bg-rose-400";
}

const PARTY_TONE: Record<Obligation["party"], "blue" | "amber" | "slate"> = {
  "party-a": "blue",
  "party-b": "amber",
  both: "slate",
};

/**
 * SECTION 1 — Adversarial Analysis workbench.
 * Upload/paste → structured analysis (heatmap, obligations) → dual-perspective
 * narrative streamed word-by-word via useCompletion.
 */
export default function AdversarialAnalysisSection({
  initialText,
  documentType = "other",
  onAnalysisComplete,
}: AdversarialAnalysisSectionProps) {
  const [text, setText] = useState(initialText ?? "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [structured, setStructured] = useState<AnalysisPayload | null>(null);
  const [selected, setSelected] = useState<Obligation | null>(null);
  const notifiedRef = useRef(false);

  const {
    completion,
    complete,
    isLoading: streaming,
    error: streamError,
    setCompletion,
  } = useCompletion({
    api: "/api/completion",
    streamProtocol: "text",
    body: { mode: "analysis", documentType },
  });

  const partyA = sectionAfter(completion, ANALYSIS_MARKERS.partyA, ANALYSIS_MARKERS.partyB);
  const partyB = sectionAfter(completion, ANALYSIS_MARKERS.partyB, null);

  // Lift the assembled result once streaming settles.
  useEffect(() => {
    if (phase !== "done" || streaming || structured === null || completion.length === 0) {
      return;
    }
    if (notifiedRef.current) {
      return;
    }
    notifiedRef.current = true;
    onAnalysisComplete?.({
      ...structured,
      narrative: completion,
      partyA,
      partyB,
    });
  }, [phase, streaming, structured, completion, partyA, partyB, onAnalysisComplete]);

  const runAnalysis = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (trimmed.length < 10) {
        setError("Paste at least 10 characters of legal text to analyse.");
        setPhase("error");
        return;
      }
      notifiedRef.current = false;
      setPhase("analyzing");
      setError(null);
      setExtractError(null);
      setStructured(null);
      setCompletion("");
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ documentText: trimmed, documentType }),
        });
        const payload: unknown = await res.json();
        const record = (payload ?? {}) as { ok?: boolean; error?: string; data?: AnalysisPayload };
        if (!res.ok || record.ok !== true || record.data === undefined) {
          throw new Error(record.error ?? "Analysis failed");
        }
        setStructured(record.data);
        await complete(trimmed);
        setPhase("done");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Analysis failed");
        setPhase("error");
      }
    },
    [complete, documentType, setCompletion],
  );

  const onFiles = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (file === undefined) {
        return;
      }
      void extractText(file).then(({ text: extracted, error: failure }) => {
        if (failure !== null) {
          setExtractError(failure);
          return;
        }
        setText(extracted);
        void runAnalysis(extracted);
      });
    },
    [runAnalysis],
  );

  const heatmapRows = useMemo(() => {
    if (structured === null) {
      return [];
    }
    return RISK_DIMENSIONS.map((dimension) => {
      const scores = structured.heatmap.cells
        .filter((cell) => cell.dimension === dimension)
        .map((cell) => cell.score);
      return { dimension, score: scores.length > 0 ? Math.max(...scores) : 0 };
    });
  }, [structured]);

  const clauseFor = (obligation: Obligation) =>
    structured?.clauses.find((c) => c.id === obligation.clauseId) ?? null;

  return (
    <section id="analyze" className="relative mx-auto w-full max-w-6xl px-6 py-24">
      <SectionHeader
        eyebrow="Engine 01 · Adversarial Analysis"
        title={
          <>
            Red-team it from <span className="text-bc">both sides</span>
          </>
        }
        description="Drop a contract to see how each side gets squeezed — dual-perspective narrative, a risk heatmap, and every obligation on a timeline."
      />

      <div className="mt-12 flex flex-col gap-6">
        {/* ---------------- Input ---------------- */}
        <Card className="gap-4">
          <FileUpload
            id="adversarial-upload"
            onFiles={onFiles}
            label="Drop a contract, filing, or policy here"
            hint="PDF, DOCX, TXT — or paste the text below"
            disabled={phase === "analyzing"}
          />
          {extractError !== null ? (
            <ErrorState
              title="Could not read that file"
              message={extractError}
              onRetry={() => {
                setExtractError(null);
                document.getElementById("adversarial-upload")?.click();
              }}
            />
          ) : null}
          <label htmlFor="adversarial-text" className="text-sm font-medium text-slate-200">
            Or paste the clause text
          </label>
          <textarea
            id="adversarial-text"
            value={text}
            rows={4}
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste rental, employment, NDA, or ToS text here…"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
          />
          <div className="flex items-center gap-3">
            <Button onClick={() => void runAnalysis(text)} disabled={phase === "analyzing"}>
              <Scale className="h-4 w-4" aria-hidden="true" />
              Analyze adversarially
            </Button>
            <span className="text-xs text-slate-500">{text.trim().length.toLocaleString()} characters</span>
          </div>
        </Card>

        {/* ---------------- Analyzing ---------------- */}
        {phase === "analyzing" ? (
          <Card tilt={false} className="magic-border gap-4 bg-slate-950/60" padding="lg">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/10 text-blue-200">
                <Scale className="h-5 w-5 animate-glow-pulse" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-100">Analyzing…</p>
                <p className="text-xs text-slate-400">
                  Splitting clauses · scoring six risk lenses · extracting obligations
                </p>
              </div>
            </div>
            <div className="progress-track" role="progressbar" aria-label="Analysis progress">
              <div className="progress-bar" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <SkeletonText lines={3} />
          </Card>
        ) : null}

        {/* ---------------- Error ---------------- */}
        {phase === "error" ? (
          <ErrorState
            title="Analysis could not complete"
            message={error ?? "Unexpected error."}
            onRetry={() => void runAnalysis(text)}
          />
        ) : null}
        {phase === "done" && streamError !== undefined && streamError !== null ? (
          <ErrorState
            title="Narrative stream interrupted"
            message="The structured results below are complete, but the narrative stopped early."
            onRetry={() => void complete(text)}
          />
        ) : null}

        {/* ---------------- Results ---------------- */}
        {phase === "done" && structured !== null ? (
          <>
            {structured.degraded && structured.message !== null ? (
              <Badge tone="amber" dot className="self-start">
                {structured.message}
              </Badge>
            ) : null}

            {/* Split-screen perspectives */}
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

            {/* Risk heatmap — color-coded bars */}
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
                {heatmapRows.map((row) => (
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

            {/* Obligation timeline */}
            <Card className="gap-5" padding="lg">
              <h3 className="text-base font-semibold text-slate-100">Obligation Timeline</h3>
              {structured.obligations.length > 0 ? (
                <ol className="flex gap-0 overflow-x-auto pb-2">
                  {structured.obligations.slice(0, 8).map((obligation, index) => (
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
                        onClick={() => setSelected(obligation)}
                        aria-label={`Open obligation details: ${obligation.action.slice(0, 60)}`}
                        className="glass w-full px-3 py-2.5 text-left transition-all hover:border-blue-400/40 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
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

            {/* Detail dialog */}
            <Dialog
              open={selected !== null}
              onClose={() => setSelected(null)}
              title={selected !== null ? (clauseFor(selected)?.reference ?? "Obligation") : "Obligation"}
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
                  {clauseFor(selected) !== null ? (
                    <div className="glass gap-2 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Source clause</p>
                      <p className="text-sm text-slate-200">{clauseFor(selected)?.title}</p>
                      <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-slate-400">
                        {clauseFor(selected)?.text}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Dialog>
          </>
        ) : phase === "idle" ? (
          <EmptyState
            icon={<Scale className="h-5 w-5" aria-hidden="true" />}
            title="Nothing to red-team yet"
            description="Upload or paste a document above and NyayaLens will argue both sides of every clause."
          />
        ) : null}
      </div>
    </section>
  );
}
