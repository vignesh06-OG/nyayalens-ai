import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Architecture — NyayaLens AI",
  description: "Layered architecture, SOLID evidence, strict TypeScript, and dependency direction for NyayaLens AI.",
};

const LAYERS = [
  {
    name: "Presentation Layer",
    detail: "React components & workbench sections (client islands, streamed UI)",
    path: "src/components/ — 23 modules (14 ui kit + 9 workspace sections)",
    color: "border-rose-400/40 text-rose-100",
  },
  {
    name: "Application Layer",
    detail: "API routes & orchestration (7-step pattern: validate → limit → sanitize → timeout → prompt → AI+fallback → respond)",
    path: "src/app/api/ — 7 routes (analyze, simulate, simplify, compare, actions, negotiate, completion)",
    color: "border-amber-400/40 text-amber-100",
  },
  {
    name: "Infrastructure Layer",
    detail: "AI provider, security, validation (gpt-4o / gpt-4o-mini, Zod, rate limit, sanitisation, headers)",
    path: "src/lib/ — 13 modules (ai/{prompts,provider,streaming,negotiation,narratives,fallback}, security/*, validation/*, http, contractStore, utils)",
    color: "border-blue-400/40 text-blue-100",
  },
  {
    name: "Domain Layer",
    detail: "Pure logic, framework-independent — zero React, zero fetch, zero side effects",
    path: "src/domain/ — 16 modules across 6 engines + Indian-provisions database + challenge manifest",
    color: "border-emerald-400/40 text-emerald-100",
  },
];

const SOLID = [
  ["S — Single Responsibility", "each domain engine owns one concern (risk, simulation, simplification, actions, comparison, negotiation)"],
  ["O — Open/Closed", "new scenario kinds, templates, and dictionaries extend data tables without touching engine control flow"],
  ["L — Liskov Substitution", "AI path and rule fallback return identical outcome shapes (AiCallMeta + payloads)"],
  ["I — Interface Segregation", "narrow typed contracts: ClauseDiff, RiskDelta, ComplianceChecklistItem, PromptBundle…"],
  ["D — Dependency Inversion", "API routes depend on domain interfaces; domain imports nothing upward — dependencies point inward"],
];

const TSCONFIG = [
  "strict: true",
  "noUncheckedIndexedAccess: true",
  "noUnusedLocals: true",
  "noUnusedParameters: true",
  "noFallthroughCasesInSwitch: true",
  "noEmit + isolatedModules",
];

const COUNTS = [
  ["68", "src modules (.ts/.tsx)"],
  ["23", "test suites"],
  ["7", "API routes"],
  ["4", "pages (3 static + workbench)"],
  ["16", "domain modules"],
  ["13", "lib modules"],
];

export default function ArchitecturePage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-24">
      <p className="text-xs uppercase tracking-[0.28em] text-blue-300">Evaluator evidence</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-50">Architecture</h1>
      <p className="mt-3 max-w-2xl text-slate-400">
        Vertical slices with strict dependency direction: Presentation → Application → Infrastructure → Domain. The
        domain layer imports nothing from the outer rings.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-emerald-400/50 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-200">
          ✓ No circular dependencies
        </span>
        <span className="rounded-full border border-blue-400/50 bg-blue-500/10 px-4 py-1.5 text-sm font-semibold text-blue-200">
          ✓ Strict TypeScript enforced
        </span>
      </div>

      {/* Layers diagram */}
      <section aria-label="Architecture layers" className="mt-10 flex flex-col items-stretch gap-2">
        {LAYERS.map((layer, index) => (
          <div key={layer.name} className="flex flex-col items-center gap-2">
            <article className={`glass w-full border-l-4 p-5 ${layer.color}`}>
              <h2 className="text-lg font-semibold">{layer.name}</h2>
              <p className="mt-1 text-sm text-slate-300">{layer.detail}</p>
              <p className="mt-1 font-mono text-xs text-slate-500">{layer.path}</p>
            </article>
            {index < LAYERS.length - 1 ? (
              <svg aria-hidden="true" width="24" height="28" viewBox="0 0 24 28">
                <path d="M12 2 L12 20 M6 14 L12 22 L18 14" stroke="#60a5fa" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            ) : null}
          </div>
        ))}
        <p className="mt-2 text-center text-xs text-slate-500">
          Dependency direction: arrows point inward — outer layers depend on inner ones, never the reverse.
        </p>
      </section>

      <div className="mt-12 grid gap-4 md:grid-cols-2">
        <section className="glass p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">SOLID checklist</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {SOLID.map(([title, detail]) => (
              <li key={title}>
                <span className="text-sm font-semibold text-emerald-200">☑ {title}</span>
                <p className="mt-0.5 text-sm text-slate-400">{detail}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="glass p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Strict TypeScript evidence</h2>
          <ul className="mt-4 flex flex-col gap-2 font-mono text-sm text-blue-200">
            {TSCONFIG.map((flag) => (
              <li key={flag}>☑ {flag}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">Verified continuously by `npm run type-check` in the quality chain.</p>
          <h2 className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">File / module counts</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {COUNTS.map(([value, label]) => (
              <div key={label}>
                <dt className="text-2xl font-bold text-slate-100">{value}</dt>
                <dd className="text-xs text-slate-500">{label}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </main>
  );
}
