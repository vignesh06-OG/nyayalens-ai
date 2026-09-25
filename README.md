# NyayaLens AI

**Challenge:** “Build a system using Generative AI that improves access to justice… useful to real people — not just lawyers.”

NyayaLens AI is a GenAI legal-intelligence workbench: adversarial dual-perspective contract analysis, a what-if scenario simulator, plain-language refracting (EN/HI), an action kit (negotiation points, redlines, lawyer prep sheet), and a clause-level comparator — every AI surface backed by deterministic rule engines with graceful fallback.

**Deploy:** https://nyayalens-ai-self.vercel.app · **Repo pages:** [/quality](/quality) · [/architecture](/architecture) · [/challenge-alignment](/challenge-alignment)

## Setup

```bash
npm install
cp .env.example .env.local   # add OPENAI_API_KEY (optional — fallbacks run without it)
npm run dev                  # http://localhost:3000
```

## Quality commands

```bash
npm run quality        # lint + type-check + test:coverage + build + npm audit
npm run test           # 174 tests in 17 suites
npm run test:coverage  # coverage with thresholds (95/95/95 statements/functions/lines)
npm run build          # strict production build (First Load JS budget enforced)
```

## Features → challenge keywords

| Problem-statement keyword | Feature | Where |
| --- | --- | --- |
| Simplifying complex legal documents | Plain Language Converter (EN/HI, grade 4–12 dial) | `PlainLanguage.tsx` |
| Comparing contracts, agreements, or policies | Contract Comparator (semantic diff + risk delta) | `Comparator.tsx` |
| Highlighting important clauses, obligations, risks | Adversarial Analysis (Party A/B, heatmap, timeline) | `AdversarialAnalysis.tsx` |
| Answering questions based on provided legal documents | Scenario Simulator | `ScenarioSimulator.tsx` |
| Understanding options and potential next steps | What-If Simulator (⚠️📜🎯 + risk gauge) | `ScenarioSimulator.tsx` |
| Summaries, checklists, actionable outputs | Action Kit (5 tabs + Download All) | `ActionKit.tsx` |
| Preparing information for a legal professional | Lawyer Prep Sheet (questions + bundle) | `ActionKit.tsx` |

## Architecture

Vertical slices; dependencies point inward — Presentation (`src/components`) → Application (`src/app/api`, 6 routes) → Infrastructure (`src/lib`: AI provider, Zod, security) → Domain (`src/domain`: 5 pure engines, framework-free). Full layer diagram, SOLID checklist, and strict-tsconfig evidence: [/architecture](/architecture). **No circular dependencies**; **no `any`** anywhere.

API discipline: every route follows validate → rate-limit → sanitize → 30 s timeout → centralised prompt → AI call with rule fallback → typed `{ok,data|error}` response. Fallback message is always exactly *“AI analysis temporarily unavailable. Showing rule-based assessment.”* Models: `gpt-4o` (analysis/compare/simulate), `gpt-4o-mini` (simplify/email).

## Stack (exact)

`next@14` · `react@18` · `tailwindcss@3` + `tailwindcss-animate` · `framer-motion` (scroll reveals only) · `ai` + `@ai-sdk/openai` · `zod` · `lucide-react` · `sonner` · `lenis` · `clsx` + `tailwind-merge` · toolchain: TypeScript (strict), Vitest + v8 coverage, ESLint (next lint).

## Docs

[SECURITY.md](SECURITY.md) · [ACCESSIBILITY.md](ACCESSIBILITY.md) · [TESTING.md](TESTING.md) · [EVALUATION.md](EVALUATION.md) · [.env.example](.env.example)
