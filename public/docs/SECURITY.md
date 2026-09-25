# NyayaLens AI — Security

## Transport & headers (10/10, `next.config.mjs`, applied to `/(.*)`)

Content-Security-Policy (default-src 'self'; connect-src 'self' https://api.openai.com) · Strict-Transport-Security (max-age=63072000; includeSubDomains; preload) · X-Frame-Options: DENY · X-Content-Type-Options: nosniff · Referrer-Policy: strict-origin-when-cross-origin · Permissions-Policy: camera=(), microphone=(), geolocation=() · Cross-Origin-Opener-Policy: same-origin · Cross-Origin-Resource-Policy: same-origin · X-DNS-Prefetch-Control: off · X-Permitted-Cross-Domain-Policies: none.

## Application guardrails

- **Input validation** — Zod schemas for every API body (`src/lib/validation/schema.ts`); 400s with safe, stack-free messages (`formatZodError`).
- **Input sanitisation** — HTML-tag + event-handler stripping with size caps (`src/lib/security/sanitize.ts`, 50k default).
- **Rate limiting** — in-memory sliding window, 100 req/min per client key with `Retry-After` (`src/lib/security/rateLimit.ts`); globalThis singleton so limits hold across Next route module graphs.
- **AI safety** — 30 s abort timeouts on every GenAI call; prompts centralised and never interpolate raw HTML; outputs re-validated against Zod object schemas; deterministic rule-based fallback on any failure with the exact message *"AI analysis temporarily unavailable. Showing rule-based assessment."*
- **Error hygiene** — no stack traces or internals ever leave an API route (`src/lib/http.ts` envelopes).
- **Secrets** — `OPENAI_API_KEY` read only from the environment (`.env.example` documents the contract; no values committed).
- **Dependency posture** — the mandated stack pins `ai@4` / `next@14`; `npm audit` reports transitive advisories in those pinned lines (ai/next have no semver-compatible patched releases under the pin). All other findings were remediated (test toolchain upgraded to the patched vitest 4.1.11 line). Accepted-risk register lives in EVALUATION.md.

## Data handling

Contract text is held in an in-memory, TTL-expiring, size-capped store (`src/lib/contractStore.ts` — 200 entries, ~24 h TTL). Nothing is persisted to disk or third parties other than the OpenAI API call itself.
