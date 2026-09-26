# NyayaLens AI — Security

## Transport & headers (10/10, `next.config.mjs`, applied to `/(.*)`)

Content-Security-Policy (`default-src 'self'`; `connect-src 'self' https://api.openai.com`; `img-src 'self' data: blob:`) · Strict-Transport-Security (`max-age=63072000; includeSubDomains; preload`) · X-Frame-Options: DENY · X-Content-Type-Options: nosniff · Referrer-Policy: strict-origin-when-cross-origin · Permissions-Policy: `camera=(), microphone=(), geolocation=()` · Cross-Origin-Opener-Policy: same-origin · Cross-Origin-Resource-Policy: same-origin · X-DNS-Prefetch-Control: off · X-Permitted-Cross-Domain-Policies: none.

The same headers are re-applied to every streaming/API response via `applySecurityHeaders` (`src/lib/security/headers.ts`), so SSE-style streams are not exempt.

### CSP rationale (honest trade-offs)

- `'unsafe-eval` is **dev-only** (`NODE_ENV !== "production"`): the webpack HMR runtime evaluates generated module code. The production bundle never ships it — verified by `curl -I` against the live deploy.
- `script-src 'unsafe-inline'` remains in production: the Next.js App Router inlines flight-data bootstrap scripts and this app runs no nonce middleware. Removing it would require a custom server or middleware nonce pipeline — recorded as an accepted trade-off, not an oversight.

## Application guardrails

- **Input validation** — Zod schemas for every API body (`src/lib/validation/schema.ts`, 6 completion modes); 400s carry safe, stack-free messages (`formatZodError`). Unknown `contractId`s get 404; wrong methods get 405; malformed JSON gets 400.
- **Input sanitisation** — HTML-tag and event-handler stripping with escaping and size caps (`src/lib/security/sanitize.ts`, 50,000-char default; per-field caps at every route, e.g. 200 for ids, 500 for goals).
- **Rate limiting** — in-memory sliding window, **100 requests / 60 s per client key** with `Retry-After` on 429 (`src/lib/security/rateLimit.ts`); `globalThis` singleton so limits hold across Next’s route-module graph.
- **Bounded ephemeral state** — analysed contracts live in a server-memory store with a **30-minute TTL and a 200-entry cap** with oldest-first eviction (`src/lib/contractStore.ts`): bounded memory, nothing persisted, nothing logged.
- **AI safety** — 30 s `AbortSignal.timeout` on every GenAI call; prompts centralised in `src/lib/ai/prompts.ts` and never interpolate raw HTML; structured outputs re-validated against Zod object schemas; deterministic rule-based fallback on any failure with the exact message *“AI analysis temporarily unavailable. Showing rule-based assessment.”* Statutory citations, risk levels, and convergence scores are rule-pinned — the model cannot invent law even when compromised or hallucinating.
- **Secrets** — `OPENAI_API_KEY` is server-side only (never referenced in client bundles; CSP `connect-src` limits browser egress to same-origin + `api.openai.com` as defence in depth). The repo contains only `.env.example`; `.env*` is git-ignored.

## Dependency posture (accepted risk, documented)

`npm audit --production` reports **1 critical, 2 high, 1 moderate** advisories against the pinned stack, named here for full disclosure:

| Package | Severity | Why it stays pinned | Compensating mitigation |
| --- | --- | --- | --- |
| `next` | critical | Fixed only in `next@16.x` — a major jump that breaks the App Router pin this project is built and tested on | No `middleware.ts` exists: all request handling is static prerendered pages plus isolated API routes; every route enforces method checks (405), Zod validation, rate limiting, and sanitized errors |
| `jsondiffpatch` (via `ai@4`) | high | Fixed in `ai@6`, which removes `useCompletion` — five UI sections depend on it | Diff rendering is server-side over already-sanitized (50k-char cap) plain text; strict CSP with no `unsafe-eval` ships in production |
| `postcss` | high | Build-time CSS processing only — never executes at runtime | Build runs in CI on pinned lockfile (`npm ci`) |
| `@ai-sdk/provider-utils` | moderate | Same `ai@4` pin as above | 30s `AI_TIMEOUT_MS` and input sanitization bound the uncontrolled-resource path |

Dev-only tooling advisories (`glob` via `eslint-config-next`) never ship to production bundles. Per the project’s no-stack-change constraint, these are **accepted, disclosed risks** rather than silently ignored ones — tracked in [EVALUATION.md](EVALUATION.md).

## Out of scope (honest limitations)

- No authentication or user accounts; rate-limit keys are best-effort client identifiers, not identities.
- The rate limiter and contract store are per-instance in-memory — on multi-instance serverless deployments limits are per instance, not global.
- No file uploads are processed: documents arrive as pasted text only, bounded by the sanitiser caps.
