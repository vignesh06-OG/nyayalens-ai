"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCompletion } from "ai/react";
import { Scale } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
import { sectionAfter } from "@/lib/utils";

import { ObligationDetailDialog, ObligationTimelineCard, PerspectiveCards, RiskHeatmapCard } from "./AdversarialPanels";

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
            <PerspectiveCards partyA={partyA} partyB={partyB} streaming={streaming} />

            {/* Risk heatmap — color-coded bars */}
            <RiskHeatmapCard rows={heatmapRows} />

            {/* Obligation timeline */}
            <ObligationTimelineCard obligations={structured.obligations} onSelect={setSelected} />

            {/* Detail dialog */}
            <ObligationDetailDialog
              selected={selected}
              clause={selected !== null ? clauseFor(selected) : null}
              onClose={() => setSelected(null)}
            />
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
