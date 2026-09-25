/**
 * Security response headers — single source of truth.
 *
 * Exported as `{ key, value }` pairs so the same list can be dropped into
 * `next.config.mjs` `headers()` verbatim; `src/lib/http.ts` applies them to
 * every API response today (middleware can apply them app-wide later).
 *
 * NOTE: no frame-blocking headers on purpose — the preview embeds the app
 * in a sandboxed iframe. Tighten with a CSP `frame-ancestors` policy via an
 * env gate when moving to production hosting.
 */

export interface SecurityHeader {
  key: string;
  value: string;
}

export const securityHeaders: readonly SecurityHeader[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];
