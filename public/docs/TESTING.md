# NyayaLens AI — Testing

## Strategy

The product’s core promise — *every AI surface has a deterministic fallback* — is what makes it testable: pure-function engines and lib services are unit-tested directly, and the AI layer is tested through mocks on **both** paths (AI success merge, and degradation to the exact rule-based output).

- **Domain engines (`src/domain/**`)** — pure unit tests: analysis (segmentation, risk scoring, heatmap, obligations, party detection), simulation (scenario evaluation, consequence cascades, probability bands, law references), simplification (readability bands, dictionary, jurisdiction), actions (playbook selection, prioritisation tie-breakers, amendments, checklist), comparison (semantic diff, risk delta, movement notes), negotiation (3-round protocol, 10 goal playbooks, convergence ladders, redline document), legal provisions (citation formatters, indexes), challenge manifest (alignment rows must stay honest).
- **AI layer (`src/lib/ai/**`)** — `ai` and `@ai-sdk/openai` are module-mocked: model selection per mode, structured-output merges, rule-pinned citations/convergence, timeout signals, and every degradation path asserting the exact `FALLBACK_MESSAGE`. Streaming tests cover all six completion modes on both the fallback and AI paths.
- **Infrastructure (`src/lib/**`)** — Zod schemas, sanitiser, sliding-window rate limiter, security headers, contract store TTL/eviction, HTTP envelope helpers.
- **Cross-engine journeys (`tests/pipeline.test.ts`)** — analyze → action kit → checklist, compare → risk delta, and the stream-marker ↔ UI-splitter contract (`sectionAfter` over `NEGOTIATION_MARKERS` etc.).
- **Docs drift guard (`src/lib/docs-sync.test.ts`)** — `public/docs/*.md` must stay byte-identical to the root `*.md` files, so the deployed `/docs/*` pages can never diverge from what reviewers read on GitHub.

## Numbers (measured 2026-09-26)

- **254 tests in 23 suites — 100% passing** (`npm test`).
- Coverage over `src/domain/**` + `src/lib/**` (type-only files and `security/headers.ts` excluded): **statements 99.06% · branches 94.91% · functions 99.47% · lines 99.03%**.
- Enforced Vitest thresholds: **98 / 90 / 98 / 98** (statements / branches / functions / lines) — the suite fails the build below them. Branch coverage was raised from 87.8% → 94.9% with pin-point tests for 28 previously uncovered branch paths.

## Running

```bash
npm test               # full suite
npm run test:watch     # watch mode
npm run test:coverage  # suite + v8 coverage + threshold enforcement
npm run quality        # lint + type-check + coverage + build + npm audit
```

## Test-design notes

- **Deterministic assertions only.** Engines are pure, so tests assert exact strings/numbers — no snapshots, no flake. Where output text is asserted, casing matches the engine verbatim.
- **Long-stream timeouts.** The no-key fallback streams narratives word-by-word (28 ms cadence); tests that consume multi-round negotiation streams carry explicit 25–30 s Vitest timeouts instead of artificially speeding the stream.
- **Expected stderr noise.** Error-path tests (unknown `contractId`, rethrown stream failures, degraded fallbacks) intentionally log `console.error` stack traces during coverage runs; they are asserted behaviour, not failures.
- **Block-bodied hooks.** `beforeEach`/`afterEach` hooks use block bodies (`() => { mock.mockReset(); }`). Expression-bodied hooks return the chainable mock, which the Vitest runner can pick up as a teardown callable — a real footgun this suite defused after a throwing mock detonated it.
- **No network, ever.** Tests never call OpenAI; `vi.mock("ai")` + `vi.mock("@ai-sdk/openai")` intercept at module level, and API-key presence is toggled via `process.env` per describe block.
