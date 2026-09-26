/**
 * Challenge-alignment manifest — ONE source of truth.
 *
 * `keywordAlignment` maps every problem-statement keyword to the feature that
 * answers it (Feature | What It Does | Why It Aligns | Measurable Outcome).
 * Consumed by `/challenge-alignment`.
 *
 * `alignmentManifest` records engineering evidence for the same delivery.
 * Consumed by `/quality` and `/challenge-alignment`.
 */

export type AlignmentStatus = "complete" | "foundation" | "in-progress" | "planned";

export interface KeywordAlignment {
  id: string;
  /** Verbatim phrase from the challenge problem statement. */
  keyword: string;
  /** Feature Name */
  feature: string;
  /** What It Does */
  whatItDoes: string;
  /** Why It Aligns */
  whyItAligns: string;
  /** Measurable Outcome */
  measurableOutcome: string;
  module: string;
  path: string;
  status: AlignmentStatus;
}

export const keywordAlignment: readonly KeywordAlignment[] = [
  {
    id: "kw-simplify",
    keyword: "Simplifying complex legal documents",
    feature: "Plain Language Converter",
    whatItDoes:
      "Two-column original/simplified rewrite with an English/हिन्दी toggle and a reading-level dial (grade 4–12) that preserves every obligation, deadline, and remedy.",
    whyItAligns:
      "Legal language is the first barrier to justice — non-lawyers must understand their own documents before they can act on them.",
    measurableOutcome:
      "Every rewrite reports its Flesch-Kincaid grade before/after (dialable 4–12) and is one-click copyable; jurisdiction auto-detected from statutory phrases.",
    module: "PlainLanguageSection",
    path: "src/components/sections/PlainLanguage.tsx",
    status: "complete",
  },
  {
    id: "kw-compare",
    keyword: "Comparing contracts, agreements, or policies",
    feature: "Contract Comparator",
    whatItDoes:
      "Clause-level semantic diff of two versions with green added / red removed / yellow modified coding and a numeric risk-delta between the versions.",
    whyItAligns:
      "People negotiate against versions they cannot line up side by side — the comparator shows exactly where the risk moved and who it favours.",
    measurableOutcome:
      "Deterministic counts of added/removed/modified clauses plus a signed aggregate Δ-risk score (e.g. −38.83 in the golden smoke run) with per-clause movements.",
    module: "ComparatorSection",
    path: "src/components/sections/Comparator.tsx",
    status: "complete",
  },
  {
    id: "kw-highlight",
    keyword: "Highlighting important clauses, obligations, risks",
    feature: "Adversarial Analysis",
    whatItDoes:
      "Red-teams the document from both sides: Party A / Party B perspective narrative, a six-lens risk heatmap, and every duty extracted onto an obligation timeline.",
    whyItAligns:
      "Unfair clauses hide in plain sight — surfacing one-sided exposure, traps, and duties is the core 'flag unfair clauses' ask.",
    measurableOutcome:
      "Six risk dimensions scored 0–100 per clause (18 heatmap cells in the golden run), aggregate risk score (79.6/100 golden), and every 'shall/must' duty extracted with party, trigger, and deadline.",
    module: "AdversarialAnalysisSection",
    path: "src/components/sections/AdversarialAnalysis.tsx",
    status: "complete",
  },
  {
    id: "kw-answer",
    keyword: "Answering questions based on provided legal documents",
    feature: "Scenario Simulator",
    whatItDoes:
      "Chat-like question interface over the uploaded contract: ask anything (or use scenario chips) and answers stream in grounded in the user's own clauses.",
    whyItAligns:
      "People need answers from their documents, not generic legal trivia — every answer is anchored to the registered contract and its provisions.",
    measurableOutcome:
      "Answers stream word-by-word and cite implicated provisions plus statute anchors (ICA/BNS/TPA §-numbers); unknown documents are rejected with 404 rather than hallucinated.",
    module: "ScenarioSimulatorSection",
    path: "src/components/sections/ScenarioSimulator.tsx",
    status: "complete",
  },
  {
    id: "kw-options",
    keyword: "Understanding options and potential next steps",
    feature: "What-If Simulator",
    whatItDoes:
      "Branches the future before it branches you: every scenario returns four cards — ⚠️ Consequences, 📜 Relevant Law, 🎯 Recommended Action, and a 📊 Risk gauge.",
    whyItAligns:
      "Understanding options means seeing consequences and next steps together — the card set is purpose-built to turn a what-if into a decision.",
    measurableOutcome:
      "Structured four-card answer with calibrated likelihood bands (rare → near-certain, e.g. 0.88 in the golden run) and an NN/100 CSS risk gauge per scenario.",
    module: "ScenarioSimulatorSection",
    path: "src/components/sections/ScenarioSimulator.tsx",
    status: "complete",
  },
  {
    id: "kw-outputs",
    keyword: "Generating summaries, checklists, or other actionable outputs",
    feature: "Action Kit",
    whatItDoes:
      "Generated after analysis: prioritised negotiation points, redline amendment drafts, email templates, lawyer questions, and a checkable compliance checklist — each copyable, all downloadable.",
    whyItAligns:
      "Analysis without outputs is commentary — the kit converts findings into artefacts the user can actually use tomorrow morning.",
    measurableOutcome:
      "From the golden run: 3 negotiation points (priority-scored 1–10, tradeable/deal-breaker flags), 3 amendment drafts, 4 lawyer questions, 6 compliance checklist tasks with deadlines, and a one-click .txt bundle.",
    module: "ActionKitSection",
    path: "src/components/sections/ActionKit.tsx",
    status: "complete",
  },
  {
    id: "kw-lawyer-prep",
    keyword: "Helping users prepare information for a legal professional",
    feature: "Lawyer Prep Sheet",
    whatItDoes:
      "Packages the analysis for counsel: the Lawyer Questions tab plus the 'Download All' bundle assemble findings, obligations, sources, and open questions into one shareable brief.",
    whyItAligns:
      "Most people meet a lawyer unprepared and pay for the privilege — a prep sheet makes the first hour productive instead of introductory.",
    measurableOutcome:
      "One-click Lawyer Prep Sheet (.txt) containing the risk score, negotiation asks, redlines, open questions with why-it-matters notes, and clause citations for every item.",
    module: "ActionKitSection",
    path: "src/components/sections/ActionKit.tsx",
    status: "complete",
  },
];

export interface ChallengeAlignment {
  id: string;
  /** What the challenge/brief asks for (engineering lens). */
  criterion: string;
  module: string;
  path: string;
  status: AlignmentStatus;
  note: string;
}

export const alignmentManifest: readonly ChallengeAlignment[] = [
  {
    id: "eng-analysis",
    criterion: "Adversarial / red-team analysis of legal documents",
    module: "Engine 01 — analysis domain",
    path: "src/domain/analysis/engine.ts",
    status: "complete",
    note: "Pure rule engine (assessClauseRisk, heatmap, obligations, riskScore) live behind POST /api/analyze with GPT-4o enrichment and rule-based fallback. Phase 3: streamed into AdversarialAnalysisSection — verified in build + smoke.",
  },
  {
    id: "eng-simulation",
    criterion: "Scenario forecasting and outcome branching",
    module: "Engine 02 — simulation domain",
    path: "src/domain/simulation/engine.ts",
    status: "complete",
    note: "Deterministic consequence chains with calibrated probabilities at POST /api/simulate; streamText narrative streams over the rule baseline. Phase 3: four-card streaming UI with CSS risk gauge.",
  },
  {
    id: "eng-simplification",
    criterion: "Plain-language access for non-lawyers",
    module: "Engine 03 — simplification domain",
    path: "src/domain/simplification/engine.ts",
    status: "complete",
    note: "Flesch-Kincaid readability, jurisdiction detection, and dictionary simplification at POST /api/simplify (gpt-4o-mini when available). Phase 3: EN/HI two-column workbench.",
  },
  {
    id: "eng-actions",
    criterion: "Actionable next steps, not just analysis",
    module: "Engine 04 — actions domain",
    path: "src/domain/actions/engine.ts",
    status: "complete",
    note: "Prioritised negotiation points, redline amendment drafts, lawyer questions, and compliance checklist at POST /api/actions (pure derivation over analysis).",
  },
  {
    id: "eng-comparison",
    criterion: "Comparative reasoning across versions or jurisdictions",
    module: "Engine 05 — comparison domain",
    path: "src/domain/comparison/engine.ts",
    status: "complete",
    note: "Semantic clause diff + risk-delta quantification at POST /api/compare with AI materiality overlay. Phase 3: colour-coded diff + blue risk-delta UI.",
  },
  {
    id: "eng-responsible",
    criterion: "Responsible AI: safety, rate limiting, input sanitisation",
    module: "Security & guardrails",
    path: "src/lib/security/ · src/lib/ai/prompts.ts",
    status: "complete",
    note: "Sliding-window limiter (100 requests / 60 s per client key), HTML-tag stripping + escaping, zod schemas on every route, 30s AI timeouts, graceful degradation. Phase 4: 10 security headers at the edge + SECURITY.md.",
  },
  {
    id: "eng-quality",
    criterion: "Trustworthy, evidence-backed outputs (GenAI quality)",
    module: "Verification harness",
    path: "tests/ · TESTING.md · EVALUATION.md",
    status: "complete",
    note: "254 Vitest tests across 23 suites (unit, cross-engine pipeline journeys, docs drift guard); coverage thresholds 98/90/98/98 enforced, measured 99.06/94.91/99.47/99.03. Statutory citations are rule-pinned — the AI layer re-voices language but can never invent law.",
  },
  {
    id: "eng-craft",
    criterion: "Engineering craft: strict TS, lean bundles, accessible motion",
    module: "Platform constraints",
    path: "tsconfig.json · next.config.mjs",
    status: "complete",
    note: "strict + noUncheckedIndexedAccess + noUnusedLocals/Parameters + noFallthroughCasesInSwitch enforced by npm run quality (lint, type-check, coverage, build, audit). Home First Load JS 102 kB against a 120 kB budget; sections client-code-split; prefers-reduced-motion disables every animation.",
  },
  {
    id: "eng-negotiation",
    criterion: "Multi-agent adversarial negotiation with statute-grounded redlines",
    module: "Engine 06 — negotiation domain",
    path: "src/domain/negotiation/engine.ts",
    status: "complete",
    note: "Three-round Party A vs Party B vs Mediator protocol across 10 goal playbooks with deterministic convergence ladders, exposed at POST /api/negotiate with a downloadable .txt redline document. AI re-voices positions; citations, convergence, and redlines stay rule-pinned. UI: NegotiationMatrix + NegotiationRounds.",
  },
  {
    id: "eng-legal",
    criterion: "Indian-law grounding (BNS, ICA, TPA, RERA, CPA, IT Act)",
    module: "Indian provisions database",
    path: "src/domain/legal/indian-provisions.ts",
    status: "complete",
    note: "19 verified provisions with topic and contract-kind indexes plus citation formatters. Encodes BNS 2023 as in force from 1 July 2024: §318 cheating (consolidating IPC 415/417/420) and §316 criminal breach of trust (consolidating IPC 405–409).",
  },
];
