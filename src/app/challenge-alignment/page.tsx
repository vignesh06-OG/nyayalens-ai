import type { Metadata } from "next";

import {
  alignmentManifest,
  keywordAlignment,
  type AlignmentStatus,
} from "@/domain/challenge/alignment-manifest";

export const metadata: Metadata = {
  title: "Challenge Alignment — NyayaLens AI",
  description: "Every problem-statement keyword mapped to a delivered feature with measurable outcomes.",
};

const statusStyle: Record<AlignmentStatus, string> = {
  complete: "border-emerald-400/50 bg-emerald-500/10 text-emerald-200",
  foundation: "border-blue-400/50 bg-blue-500/10 text-blue-200",
  "in-progress": "border-amber-400/50 bg-amber-500/10 text-amber-200",
  planned: "border-slate-400/40 bg-white/5 text-slate-300",
};

const statusLabel: Record<AlignmentStatus, string> = {
  complete: "complete — verified",
  foundation: "foundation shipped",
  "in-progress": "in progress",
  planned: "planned",
};

export default function ChallengeAlignmentPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-24">
      <p className="text-xs uppercase tracking-[0.28em] text-blue-300">Evaluator evidence</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-50">Challenge Alignment</h1>
      <p className="mt-3 max-w-2xl text-slate-400">
        One source of truth: <code className="text-blue-200">src/domain/challenge/alignment-manifest.ts</code>. Every
        problem-statement keyword below maps to a shipped feature with a measurable outcome.
      </p>

      <div className="mt-10 flex flex-col gap-6">
        {keywordAlignment.map((row) => (
          <article key={row.id} className="glass p-6">
            <header className="flex flex-wrap items-center gap-3">
              <span className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 font-mono text-xs text-slate-300">
                “{row.keyword}”
              </span>
              <span aria-hidden="true" className="text-slate-600">→</span>
              <h2 className="text-xl font-semibold text-slate-50">{row.feature}</h2>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle[row.status]}`}>
                {statusLabel[row.status]}
              </span>
            </header>
            <dl className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">What It Does</dt>
                <dd className="mt-1 text-sm leading-relaxed text-slate-300">{row.whatItDoes}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Why It Aligns</dt>
                <dd className="mt-1 text-sm leading-relaxed text-slate-300">{row.whyItAligns}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Measurable Outcome</dt>
                <dd className="mt-1 text-sm leading-relaxed text-emerald-100">{row.measurableOutcome}</dd>
              </div>
            </dl>
            <p className="mt-3 font-mono text-xs text-slate-400">{row.path} · {row.module}</p>
          </article>
        ))}
      </div>

      <section aria-label="Engineering evidence" className="mt-14">
        <h2 className="text-lg font-semibold text-slate-100">Engineering evidence</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {alignmentManifest.map((entry) => (
            <li key={entry.id} className="glass p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-200">{entry.criterion}</h3>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusStyle[entry.status]}`}>
                  {statusLabel[entry.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{entry.note}</p>
              <p className="mt-1 font-mono text-[11px] text-slate-400">{entry.path}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
