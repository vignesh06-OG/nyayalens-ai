"use client";

import { useCallback, useMemo, useState } from "react";
import { useCompletion } from "ai/react";
import { GitCompare } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FileUpload, extractText } from "@/components/ui/FileUpload";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { DiffResult, RiskDelta } from "@/domain/comparison/types";
import { cn } from "@/lib/utils";

import { DiffRowsCard, RiskDeltaCard } from "./ComparatorPanels";

export interface ComparatorSectionProps {
  initialDocA?: string;
  initialDocB?: string;
}

interface ComparePayload {
  diff: DiffResult;
  riskDelta: RiskDelta;
  summary: string;
  materiality: string[];
  degraded: boolean;
  message: string | null;
}

/**
 * SECTION 5 — Contract Comparator.
 * Two side-by-side document panes → diff view with add/remove/modify color
 * coding and a blue risk-delta indicator. The materiality narrative streams
 * word-by-word via useCompletion while the structured diff renders instantly.
 */
export default function ComparatorSection({ initialDocA = "", initialDocB = "" }: ComparatorSectionProps) {
  const [docA, setDocA] = useState(initialDocA);
  const [docB, setDocB] = useState(initialDocB);
  const [result, setResult] = useState<ComparePayload | null>(null);
  const [phase, setPhase] = useState<"idle" | "comparing" | "error" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const { completion, complete, isLoading: streaming, error: streamError } = useCompletion({
    api: "/api/completion",
    streamProtocol: "text",
    body: { mode: "compare", docB: docB.slice(0, 20_000) },
  });

  const loadSide = useCallback((side: "a" | "b") => (files: File[]) => {
    const file = files[0];
    if (file === undefined) {
      return;
    }
    void extractText(file).then(({ text, error: failure }) => {
      if (failure !== null) {
        setError(failure);
        setPhase("error");
        return;
      }
      if (side === "a") {
        setDocA(text);
      } else {
        setDocB(text);
      }
    });
  }, []);

  const runCompare = useCallback(async () => {
    if (docA.trim().length < 10 || docB.trim().length < 10) {
      setError("Both versions need at least 10 characters of text.");
      setPhase("error");
      return;
    }
    setPhase("comparing");
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ docA: docA.trim(), docB: docB.trim() }),
      });
      const payload: unknown = await res.json();
      const record = (payload ?? {}) as { ok?: boolean; error?: string; data?: ComparePayload };
      if (!res.ok || record.ok !== true || record.data === undefined) {
        throw new Error(record.error ?? "Comparison failed");
      }
      setResult(record.data);
      setPhase("done");
      await complete(docA.trim());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Comparison failed");
      setPhase("error");
    }
  }, [complete, docA, docB]);

  const delta = result?.riskDelta.delta ?? 0;
  const deltaLabel = useMemo(() => {
    if (delta <= -5) {
      return "Target version is safer";
    }
    if (delta >= 5) {
      return "Target version is riskier";
    }
    return "Roughly unchanged";
  }, [delta]);

  return (
    <section id="compare" className="relative mx-auto w-full max-w-6xl px-6 py-24">
      <SectionHeader
        eyebrow="Engine 05 · Comparator"
        title={
          <>
            Two versions. <span className="text-bc">One truth.</span>
          </>
        }
        description="Clause-level semantic diff with added/removed/modified coding and a measured risk delta between the versions."
      />

      <div className="mt-12 flex flex-col gap-6">
        {/* Two panes */}
        <div className="grid gap-4 md:grid-cols-2">
          {(
            [
              { side: "a" as const, label: "Version A · base", value: docA, set: setDocA },
              { side: "b" as const, label: "Version B · target", value: docB, set: setDocB },
            ]
          ).map((pane) => (
            <Card key={pane.side} className="gap-3" padding="lg">
              <h3 className="text-base font-semibold text-slate-100">{pane.label}</h3>
              <FileUpload
                id={`compare-upload-${pane.side}`}
                compact
                onFiles={loadSide(pane.side)}
                label={`Drop ${pane.label} here`}
                hint="PDF, DOCX, TXT — or paste below"
              />
              <label htmlFor={`compare-text-${pane.side}`} className="sr-only">
                {pane.label} text
              </label>
              <textarea
                id={`compare-text-${pane.side}`}
                value={pane.value}
                rows={8}
                onChange={(event) => pane.set(event.target.value)}
                placeholder="Paste the clause text for this version…"
                className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
              />
            </Card>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Button onClick={() => void runCompare()} disabled={phase === "comparing"} aria-label="Compare the two versions">
            <GitCompare className="h-4 w-4" aria-hidden="true" />
            {phase === "comparing" ? "Comparing…" : "Compare"}
          </Button>
          <span className="text-xs text-slate-500">
            {docA.trim().length + docB.trim().length > 0
              ? `${(docA.trim().length + docB.trim().length).toLocaleString()} characters across both versions`
              : "Load both versions to enable comparison"}
          </span>
        </div>

        {phase === "comparing" ? (
          <Card tilt={false} className="magic-border gap-4 bg-slate-950/60" padding="lg">
            <div className="progress-track" role="progressbar" aria-label="Comparison progress">
              <div className="progress-bar" />
            </div>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-2/3" />
            </div>
          </Card>
        ) : null}

        {phase === "error" ? (
          <ErrorState
            title="Comparison could not complete"
            message={error ?? "Unexpected error."}
            onRetry={() => void runCompare()}
          />
        ) : null}

        {phase === "done" && result !== null ? (
          <>
            {/* Risk delta indicator (blue) */}
            <RiskDeltaCard delta={delta} deltaLabel={deltaLabel} riskDelta={result.riskDelta} />

            {/* Streaming narrative */}
            <Card className={cn("gap-3", streaming && "magic-border bg-slate-950/60")} padding="lg">
              <h3 className="text-base font-semibold text-slate-100">Materiality narrative</h3>
              {completion.length > 0 ? (
                <p className={cn("whitespace-pre-wrap text-sm leading-relaxed text-slate-200", streaming && "stream-caret")}>
                  {completion}
                </p>
              ) : streaming ? (
                <SkeletonText lines={4} />
              ) : streamError !== undefined && streamError !== null ? (
                <ErrorState
                  title="Narrative stream interrupted"
                  message={streamError.message ?? "The narrative could not stream."}
                  onRetry={() => void complete(docA.trim())}
                />
              ) : (
                <p className="text-sm text-slate-500">{result.summary}</p>
              )}
            </Card>

            {/* Diff rows */}
            <DiffRowsCard diff={result.diff} />
          </>
        ) : phase === "idle" ? (
          <EmptyState
            icon={<GitCompare className="h-5 w-5" aria-hidden="true" />}
            title="Nothing to compare yet"
            description="Load two versions — an old and a new draft, or two jurisdiction templates — and press Compare to see where the risk moved."
          />
        ) : null}
      </div>
    </section>
  );
}
