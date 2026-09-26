"use client";

import { useCallback, useMemo, useState } from "react";
import { useCompletion } from "ai/react";
import { Download, Gavel, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonText } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Tabs, type TabItem } from "@/components/ui/Tabs";
import { buildComplianceChecklist, generateActionKit } from "@/domain/actions/engine";
import { cn } from "@/lib/utils";

import {
  AmendmentsPanel,
  ChecklistPanel,
  CopyButton,
  NegotiationPointsPanel,
  QuestionsPanel,
} from "./ActionKitPanels";
import type { AnalysisSectionResult } from "./AdversarialAnalysis";

export interface ActionKitSectionProps {
  /** Output of Adversarial Analysis — the kit is derived from it (never standalone). */
  analysis: AnalysisSectionResult | null;
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
      content: <NegotiationPointsPanel points={kit.negotiationPoints} />,
    },
    {
      id: "amendments",
      label: "Amendment Drafts",
      content: <AmendmentsPanel drafts={kit.amendments} />,
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
      content: <QuestionsPanel questions={kit.questionsForLawyer} />,
    },
    {
      id: "checklist",
      label: "Compliance Checklist",
      content: <ChecklistPanel items={checklist} checked={checked} onToggle={toggle} />,
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
