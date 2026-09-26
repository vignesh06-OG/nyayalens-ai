// ---------------------------------------------------------------------------
// NyayaLens AI — hero content data
// Feature card definitions + marquee content for the hero section.
// ---------------------------------------------------------------------------

import {
  Gavel,
  GitBranch,
  GitCompare,
  Handshake,
  MessageSquare,
  Scale,
  type LucideIcon,
} from "lucide-react";

import type { CardAccent } from "@/components/ui/Card";

export interface FeatureCard {
  id: string;
  icon: LucideIcon;
  accent: CardAccent;
  title: string;
  description: string;
  /** Grid span (bento: first card spans 2 columns). */
  span: string;
}

export const features: readonly FeatureCard[] = [
  {
    id: "adversarial-analysis",
    icon: Scale,
    accent: "blue",
    title: "Adversarial Analysis",
    description:
      "Dual-perspective red-teaming from both sides of the table. Surface hidden leverage, ambush clauses, and the arguments opposing counsel will wish they filed first.",
    span: "md:col-span-2",
  },
  {
    id: "what-if-simulator",
    icon: GitBranch,
    accent: "purple",
    title: "What-If Simulator",
    description:
      "Trigger any clause and watch the consequences cascade through the whole agreement — with likelihood bands on every branch.",
    span: "",
  },
  {
    id: "plain-language",
    icon: MessageSquare,
    accent: "emerald",
    title: "Plain Language",
    description:
      "Dense legalese refracted into clear prose your client can act on — without pulling the teeth.",
    span: "",
  },
  {
    id: "action-kit",
    icon: Gavel,
    accent: "amber",
    title: "Action Kit",
    description:
      "Ready-to-use negotiation levers, notice templates, and escalation steps generated from your own document.",
    span: "",
  },
  {
    id: "contract-comparator",
    icon: GitCompare,
    accent: "cyan",
    title: "Contract Comparator",
    description:
      "Diff two versions or two jurisdictions clause by clause, with materiality explained in plain words.",
    span: "",
  },
  {
    id: "multi-agent-negotiation",
    icon: Handshake,
    accent: "rose",
    title: "Multi-Agent Negotiation",
    description:
      "Three AI agents — Party A, Party B, and a Mediator — debate your contract for three rounds and settle on statute-grounded redlines you can download.",
    span: "",
  },
] as const;

export const marqueeItems = [
  "Rental Agreements",
  "Employment Contracts",
  "NDAs",
  "Terms of Service",
  "Vendor Agreements",
  "Partnership Deeds",
  "Loan Documents",
  "Property Papers",
] as const;

export const iconBg: Record<CardAccent, string> = {
  blue: "border-blue-400/25 bg-blue-500/10",
  purple: "border-purple-400/25 bg-purple-500/10",
  cyan: "border-cyan-400/25 bg-cyan-500/10",
  amber: "border-amber-400/25 bg-amber-500/10",
  emerald: "border-emerald-400/25 bg-emerald-500/10",
  rose: "border-rose-400/25 bg-rose-500/10",
};

export const iconText: Record<CardAccent, string> = {
  blue: "text-blue-300",
  purple: "text-purple-300",
  cyan: "text-cyan-300",
  amber: "text-amber-300",
  emerald: "text-emerald-300",
  rose: "text-rose-300",
};
