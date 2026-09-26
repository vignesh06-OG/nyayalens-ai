// ---------------------------------------------------------------------------
// NyayaLens AI — action kit panels
// Tab content components: negotiation points, amendment drafts, lawyer
// questions, compliance checklist — plus the shared copy-to-clipboard button.
// ---------------------------------------------------------------------------

"use client";

import { useState } from "react";
import { Check, Copy, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

import type {
  AmendmentDraft,
  ComplianceChecklistItem,
  LawyerQuestion,
  NegotiationPoint,
} from "@/domain/actions/types";
import type { RiskLevel } from "@/domain/analysis/types";

export const severityTone: Record<RiskLevel, "amber" | "rose" | "emerald"> = {
  low: "emerald",
  medium: "amber",
  high: "rose",
  critical: "rose",
};

export function CopyButton({ value, label }: { value: string; label: string }) {
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

/** Negotiation points tab — severity-toned cards with copy actions. */
export function NegotiationPointsPanel({ points }: { points: NegotiationPoint[] }) {
  return (
    <div className="flex flex-col gap-3">
      {points.map((point) => (
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
  );
}

/** Amendment drafts tab — original vs proposed redline text. */
export function AmendmentsPanel({ drafts }: { drafts: AmendmentDraft[] }) {
  return (
    <div className="flex flex-col gap-3">
      {drafts.map((draft) => (
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
  );
}

/** Lawyer questions tab — ambiguity escalations for counsel. */
export function QuestionsPanel({ questions }: { questions: LawyerQuestion[] }) {
  return (
    <div className="flex flex-col gap-3">
      {questions.map((question) => (
        <Card key={question.id} className="items-start gap-3">
          <div className="flex w-full items-start justify-between gap-3">
            <h4 className="text-base font-semibold text-slate-100">{question.question}</h4>
            <CopyButton label={`Copy lawyer question: ${question.question}`} value={question.question} />
          </div>
          <p className="text-sm text-slate-400">{question.whyItMatters}</p>
          <Badge tone="slate">{question.topic}</Badge>
        </Card>
      ))}
      {questions.length === 0 ? (
        <EmptyState
          title="Nothing ambiguous enough to escalate"
          description="The rule engine found no open questions worth counsel's time in this draft."
        />
      ) : null}
    </div>
  );
}

/** Compliance checklist tab — interactive, derived from extracted obligations. */
export function ChecklistPanel({
  items,
  checked,
  onToggle,
}: {
  items: ComplianceChecklistItem[];
  checked: ReadonlySet<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <Card key={item.id} className="items-start gap-3">
          <div className="flex w-full items-start justify-between gap-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={checked.has(item.id)}
                onChange={() => onToggle(item.id)}
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
      {items.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-5 w-5" aria-hidden="true" />}
          title="No obligations extracted"
          description="A compliance checklist appears once the analysis finds duties to perform."
        />
      ) : null}
    </div>
  );
}
