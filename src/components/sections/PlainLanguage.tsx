"use client";

import { useCallback, useMemo, useState } from "react";
import { useCompletion } from "ai/react";
import { Check, Copy, Globe2, Languages, ScrollText } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonText } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { assessReadability, detectJurisdiction } from "@/domain/simplification/engine";
import { cn } from "@/lib/utils";

export interface PlainLanguageSectionProps {
  /** Original text (editable in place). */
  text?: string;
  language?: "en" | "hi";
  initialTargetLevel?: number;
}

type Lang = "en" | "hi";

/**
 * SECTION 3 — Plain Language refractor.
 * Two-column original/simplified view with language toggle (EN/HI),
 * reading-level slider, auto-detected jurisdiction badge, and copy action.
 * The simplified column streams word-by-word via useCompletion.
 */
export default function PlainLanguageSection({
  text = "",
  language = "en",
  initialTargetLevel = 8,
}: PlainLanguageSectionProps) {
  const [original, setOriginal] = useState(text);
  const [lang, setLang] = useState<Lang>(language);
  const [targetLevel, setTargetLevel] = useState(initialTargetLevel);
  const [copied, setCopied] = useState(false);

  const jurisdiction = useMemo(() => detectJurisdiction(original), [original]);
  const originalReadability = useMemo(() => assessReadability(original), [original]);

  const { completion, complete, isLoading, error, setCompletion } = useCompletion({
    api: "/api/completion",
    streamProtocol: "text",
    body: { mode: "simplify", targetLevel, language: lang },
  });

  const simplifiedReadability = useMemo(
    () => (completion.length > 0 ? assessReadability(completion) : null),
    [completion],
  );

  const run = useCallback(() => {
    if (original.trim().length < 10) {
      toast.error("Paste at least 10 characters of text first.");
      return;
    }
    setCompletion("");
    void complete(original);
  }, [complete, original, setCompletion]);

  const copySimplified = useCallback(() => {
    if (completion.length === 0) {
      return;
    }
    void navigator.clipboard
      .writeText(completion)
      .then(() => {
        setCopied(true);
        toast.success("Simplified text copied.");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("Clipboard unavailable in this browser."));
  }, [completion]);

  return (
    <section id="plain-language" className="relative mx-auto w-full max-w-6xl px-6 py-24">
      <SectionHeader
        eyebrow="Engine 03 · Plain Language"
        title={
          <>
            Legalese in. <span className="text-bc">Clarity out.</span>
          </>
        }
        description="Side-by-side refracting with a reading-level dial — every obligation, deadline, and remedy survives the rewrite."
      />

      <div className="mt-12 flex flex-col gap-6">
        {/* Controls */}
        <Card className="flex flex-wrap items-center gap-6" padding="sm">
          <div className="flex items-center gap-2" role="group" aria-label="Output language">
            <Languages className="h-4 w-4 text-slate-400" aria-hidden="true" />
            {(["en", "hi"] as const).map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={lang === code}
                onClick={() => setLang(code)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                  lang === code
                    ? "bg-blue-500/20 text-blue-200 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                )}
              >
                {code === "en" ? "English" : "हिन्दी"}
              </button>
            ))}
          </div>

          <div className="flex min-w-[14rem] flex-1 items-center gap-3">
            <label htmlFor="reading-level" className="text-sm text-slate-300">
              Reading level
            </label>
            <input
              id="reading-level"
              type="range"
              min={4}
              max={12}
              step={1}
              value={targetLevel}
              aria-label={`Target reading level: grade ${targetLevel}`}
              onChange={(event) => setTargetLevel(Number(event.target.value))}
              className="flex-1 accent-blue-500"
            />
            <output htmlFor="reading-level" className="w-16 text-right text-sm tabular-nums text-slate-200">
              Grade {targetLevel}
            </output>
          </div>

          <Button
            onClick={run}
            disabled={isLoading || original.trim().length < 10}
            aria-label="Simplify the text"
          >
            {isLoading ? "Refracting…" : "Simplify"}
          </Button>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Original */}
          <Card className="gap-3" padding="lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-100">
                <ScrollText className="h-4 w-4 text-slate-400" aria-hidden="true" /> Original
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {jurisdiction.code !== "unknown" ? (
                  <Badge tone="blue" dot>
                    <Globe2 className="h-3 w-3" aria-hidden="true" /> {jurisdiction.label}
                  </Badge>
                ) : (
                  <Badge tone="slate">Jurisdiction unstated</Badge>
                )}
                {original.trim().length > 0 ? (
                  <Badge tone="slate">Grade {originalReadability.fleschKincaidGrade.toFixed(1)}</Badge>
                ) : null}
              </div>
            </div>
            <label htmlFor="plain-original" className="sr-only">
              Original legal text
            </label>
            <textarea
              id="plain-original"
              value={original}
              rows={14}
              onChange={(event) => setOriginal(event.target.value)}
              placeholder="Paste the legalese here — jurisdiction is detected automatically."
              className="w-full flex-1 resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-slate-200 placeholder:text-slate-500 focus:border-blue-400/50 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
            />
            {jurisdiction.signals.length > 0 ? (
              <p className="text-xs text-slate-500">Signals: {jurisdiction.signals.join(", ")}</p>
            ) : null}
          </Card>

          {/* Simplified */}
          <Card className={cn("gap-3", isLoading && "magic-border bg-slate-950/60")} padding="lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-100">
                Simplified {lang === "hi" ? "(हिन्दी)" : "(English)"}
              </h3>
              <div className="flex items-center gap-2">
                {simplifiedReadability !== null && !isLoading ? (
                  <Badge tone={simplifiedReadability.fleschKincaidGrade <= targetLevel ? "emerald" : "amber"}>
                    Grade {simplifiedReadability.fleschKincaidGrade.toFixed(1)}
                  </Badge>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copySimplified}
                  disabled={completion.length === 0}
                  aria-label="Copy simplified text to clipboard"
                  className="border border-white/10"
                >
                  {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            {error !== undefined && error !== null ? (
              <ErrorState
                title="Refracting failed"
                message={error.message ?? "The simplification stream could not complete."}
                onRetry={run}
              />
            ) : completion.length > 0 ? (
              <p className={cn("whitespace-pre-wrap text-sm leading-relaxed text-slate-200", isLoading && "stream-caret")}>
                {completion}
              </p>
            ) : isLoading ? (
              <SkeletonText lines={8} />
            ) : (
              <EmptyState
                title="Clarity lands here"
                description="Paste text on the left and press Simplify. The rewrite streams in word-by-word at your chosen reading level."
              />
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}
