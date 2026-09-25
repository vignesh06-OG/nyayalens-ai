import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";

/**
 * Cross-cutting — quality & evidence dossier (Phase 2).
 * Mirrors the static brief at `/quality`; logic lands with the engines.
 */
export default function QualityEvidence() {
  return (
    <section id="quality-evidence" className="relative mx-auto w-full max-w-6xl px-6 py-24">
      <SectionHeader
        eyebrow="Evidence"
        title="Quality & Evidence"
        description="Citations, confidence bands, and an audit trail behind every output."
        align="left"
      />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <Card className="gap-4">
          <Badge tone="emerald" dot>
            Phase 2
          </Badge>
          <p className="text-sm leading-relaxed text-slate-400">
            Golden-set regression scores and citation audits will render here. The framework is
            briefed at{" "}
            <a href="/quality" className="text-blue-300 underline-offset-4 hover:underline">
              /quality
            </a>
            .
          </p>
        </Card>
      </div>
    </section>
  );
}
