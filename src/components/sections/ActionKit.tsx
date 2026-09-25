"use client";

import { useCallback, useMemo, useState } from "react";
import { useCompletion } from "ai/react";
import { Check, Copy, Download, Gavel, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonText } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { buildComplianceChecklist, generateActionKit } from "@/domain/actions/engine";
import type { RiskLevel } from "@/domain/analysis/types";
import { cn } from "@/lib/utils";

import type { AnalysisSectionResult } from "./AdversarialAnalysis";

export interface ActionKitSectionProps {
  /** Output of Adversarial Analysis — the kit is derived from it (never standalone). */
  analysis: AnalysisSectionResult | null;
}

const severityTone: Record<RiskLevel, "amber" | "rose" | "emerald"> = {
  low: "emerald",
  medium: "amber",
  high: "rose",
  critical: "rose",
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={label}
      onClick={() => {
        void navigator.clipboard
          .writeText(value)
          .then(() => {
            setCopied(true);
            toast.success("Copied to clipboard.");
            setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => toast.error("Clipboard unavailable in this browser."));
      }}
      className="shrink-0 border border-white/10"
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

/**
 * SECTION 4 — Action Kit (derived from analysis, never standalone).
 * Five tabs: negotiation points · amendment drafts · email templates
 * (streamed via useCompletion) · lawyer questions · compliance checklist.
 * "Download All" exports a single .txt brief.
 */
export default function ActionKitSection({ analysis }: ActionKitSectionProps) {
  const [tab, setTab] = useState("negotiation");
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());

  const kit = useMemo(
    () => (analysis !== null ? generateActionKit(analysis) : null),
    [analysis],
  );
  const checklist = useMemo(
    () => (analysis !== null ? buildComplianceChecklist(analysis) : []),
    [analysis],
  );

  const emailContext = useMemo(() => {
    if (kit === null) {
      return "";
    }
    return kit.negotiationPoints
      .slice(0, 4)
      .map((p) => `- ${p.title}: ${p.ask}`)
      .join("\n");
  }, [kit]);

  const { completion: email, complete: completeEmail, isLoading: emailing, error: emailError } =
    useCompletion({
      api: "/api/completion",
      streamProtocol: "text",
      body: { mode: "email" },
    });

  const toggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const downloadAll = useCallback(() => {
    if (kit === null || analysis === null) {
      return;
    }
    const lines: string[] = [
      "NyayaLens AI — Action Kit",
      `Risk score: ${analysis.riskScore}/100`,
      "",
      "== NEGOTIATION POINTS ==",
      ...kit.negotiationPoints.map((p) => `• [${p.severity}] ${p.title}\n  Ask: ${p.ask}\n  Why: ${p.rationale}`),
      "",
      "== AMENDMENT DRAFTS ==",
      ...kit.amendments.map((a) => `• ${a.issue}\n  ${a.proposedText}\n  Rationale: ${a.rationale}`),
      "",
      "== EMAIL TEMPLATES ==",
      email.length > 0 ? email : "(draft on the Email Templates tab)",
      "",
      "== LAWYER QUESTIONS ==",
      ...kit.questionsForLawyer.map((q) => `• ${q.question}\n  (${q.whyItMatters})`),
      "",
      "== COMPLIANCE CHECKLIST ==",
      ...checklist.map((c) => `☐ ${c.task}${c.due !== null ? ` — ${c.due}` : ""} [${c.sourceClause}]`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nyayalens-action-kit.txt";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Action kit downloaded.");
  }, [analysis, checklist, email, kit]);

  if (analysis === null || kit === null) {
    return (
      <section id="action-kit" className="relative mx-auto w-full max-w-6xl px-6 py-24">
        <SectionHeader
          eyebrow="Engine 04 · Action Kit"
          title={
            <>
              From findings to <span className="text-bc">moves</span>
            </>
          }
          description="The kit is generated from your adversarial analysis — negotiation levers, redlines, emails, and a compliance checklist."
        />
        <div className="mt-12">
          <EmptyState
            icon={<Gavel className="h-5 w-5" aria-hidden="true" />}
            title="No analysis to act on yet"
            description="Run Adversarial Analysis first — every negotiation point and amendment below is derived from its findings."
            action={<Button href="#analyze">Run Adversarial Analysis</Button>}
          />
        </div>
      </section>
    );
  }

  const tabs: TabItem[] = [
    {
      id: "negotiation",
      label: "Negotiation Points",
      content: (
        <div className="flex flex-col gap-3">
          {kit.negotiationPoints.map((point) => (
            <Card key={point.id} className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={severityTone[point.severity]} dot>
                    {point.severity}
                  </Badge>
                  <Badge tone="slate">Priority {point.priority}/10</Badge>
                  {!point.tradeable ? <Badge tone="rose">Deal-breaker</Badge> : null}
                </div>
                <CopyButton
                  label={`Copy negotiation point: ${point.title}`}
                  value={`${point.title}\nAsk: ${point.ask}\nWhy: ${point.rationale}`}
                />
              </div>
              <h4 className="text-base font-semibold text-slate-100">{point.title}</h4>
              <p className="text-sm text-blue-200/90">Ask: {point.ask}</p>
              <p className="text-sm text-slate-400">{point.rationale}</p>
            </Card>
          ))}
        </div>
      ),
    },
    {
      id: "amendments",
      label: "Amendment Drafts",
      content: (
        <div className="flex flex-col gap-3">
          {kit.amendments.map((draft) => (
            <Card key={draft.id} className="gap-3">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-base font-semibold text-slate-100">{draft.issue}</h4>
                <CopyButton label={`Copy amendment draft: ${draft.issue}`} value={draft.proposedText} />
              </div>
              <p className="line-clamp-2 font-mono text-xs text-slate-500">{draft.originalText}</p>
              <p className="whitespace-pre-wrap border-l-2 border-emerald-400/60 pl-3 text-sm text-emerald-100/90">
                {draft.proposedText}
              </p>
              <p className="text-sm text-slate-400">{draft.rationale}</p>
              {draft.fallbackPosition !== null ? (
                <p className="text-xs text-amber-200/80">Fallback: {draft.fallbackPosition}</p>
              ) : null}
            </Card>
          ))}
        </div>
      ),
    },
    {
      id: "emails",
      label: "Email Templates",
      content: (
        <Card className={cn("gap-3", emailing && "magic-border bg-slate-950/60")} padding="lg">
          <div className="flex items-center justify-between gap-3">
            <h4 className="flex items-center gap-2 text-base font-semibold text-slate-100">
              <Mail className="h-4 w-4 text-blue-300" aria-hidden="true" /> Negotiation cover email
            </h4>
            <div className="flex items-center gap-2">
              {email.length > 0 ? <CopyButton label="Copy email draft" value={email} /> : null}
              <Button
                size="sm"
                onClick={() => void completeEmail(emailContext)}
                disabled={emailing}
                aria-label="Draft cover email"
              >
                {emailing ? "Drafting…" : email.length > 0 ? "Redraft" : "Draft email"}
              </Button>
            </div>
          </div>
          {emailError !== undefined && emailError !== null ? (
            <ErrorState
              title="Email draft failed"
              message={emailError.message ?? "The email stream could not complete."}
              onRetry={() => void completeEmail(emailContext)}
            />
          ) : email.length > 0 ? (
            <p className={cn("whitespace-pre-wrap text-sm leading-relaxed text-slate-200", emailing && "stream-caret")}>
              {email}
            </p>
          ) : emailing ? (
            <SkeletonText lines={8} />
          ) : (
            <EmptyState
              title="One click to a ready-to-send draft"
              description="NyayaLens leads with your strongest ask and stays firm-but-polite. Press “Draft email” to stream one."
            />
          )}
        </Card>
      ),
    },
    {
      id: "questions",
      label: "Lawyer Questions",
      content: (
        <div className="flex flex-col gap-3">
          {kit.questionsForLawyer.map((question) => (
            <Card key={question.id} className="items-start gap-3">
              <div className="flex w-full items-start justify-between gap-3">
                <h4 className="text-base font-semibold text-slate-100">{question.question}</h4>
                <CopyButton label={`Copy lawyer question: ${question.question}`} value={question.question} />
              </div>
              <p className="text-sm text-slate-400">{question.whyItMatters}</p>
              <Badge tone="slate">{question.topic}</Badge>
            </Card>
          ))}
          {kit.questionsForLawyer.length === 0 ? (
            <EmptyState
              title="Nothing ambiguous enough to escalate"
              description="The rule engine found no open questions worth counsel's time in this draft."
            />
          ) : null}
        </div>
      ),
    },
    {
      id: "checklist",
      label: "Compliance Checklist",
      content: (
        <div className="flex flex-col gap-3">
          {checklist.map((item) => (
            <Card key={item.id} className="items-start gap-3">
              <div className="flex w-full items-start justify-between gap-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checked.has(item.id)}
                    onChange={() => toggle(item.id)}
                    aria-label={`Mark compliant: ${item.task.slice(0, 70)}`}
                    className="mt-1 h-4 w-4 accent-emerald-500"
                  />
                  <span className={cn("text-sm leading-relaxed", checked.has(item.id) ? "text-slate-500 line-through" : "text-slate-200")}>
                    {item.task}
                  </span>
                </label>
                <CopyButton label={`Copy checklist task: ${item.task.slice(0, 50)}`} value={item.task} />
              </div>
              <div className="flex flex-wrap items-center gap-2 pl-7">
                <Badge tone={item.due !== null ? "amber" : "rose"} dot>
                  {item.due ?? "No deadline — clarify first"}
                </Badge>
                <Badge tone="slate">{item.sourceClause}</Badge>
              </div>
            </Card>
          ))}
          {checklist.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
              title="No obligations extracted"
              description="A compliance checklist appears once the analysis finds duties to perform."
            />
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <section id="action-kit" className="relative mx-auto w-full max-w-6xl px-6 py-24">
      <SectionHeader
        eyebrow="Engine 04 · Action Kit"
        title={
          <>
            From findings to <span className="text-bc">moves</span>
          </>
        }
        description={`Built from your analysis (risk score ${analysis.riskScore}/100) — ${kit.negotiationPoints.length} negotiation points, ${kit.amendments.length} redlines, ${checklist.length} compliance tasks.`}
      />

      <div className="mt-12 flex flex-col gap-4">
        <div className="flex justify-end">
          <Button variant="secondary" onClick={downloadAll} aria-label="Download the full action kit as a text file">
            <Download className="h-4 w-4" aria-hidden="true" />
            Download All (.txt)
          </Button>
        </div>
        <Tabs tabs={tabs} value={tab} onChange={setTab} label="Action kit views" />
      </div>
    </section>
  );
}
