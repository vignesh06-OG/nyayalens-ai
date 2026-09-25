/**
 * In-memory sliding-window rate limiter: 100 req/min per key (IP).
 * Not durable across restarts — swap for KV/Redis in production scale-out.
 */

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 100;
const MAX_TRACKED_KEYS = 2_000;

// State lives on globalThis: Next.js compiles each route with its own module
// graph, so a plain module-level Map would not be shared across routes in dev.
type GlobalWithHits = typeof globalThis & {
  __nyayalensRateHits?: Map<string, number[]>;
};

const hits: Map<string, number[]> =
  (globalThis as GlobalWithHits).__nyayalensRateHits ??= new Map<string, number[]>();

function prune(now: number): void {
  const windowStart = now - WINDOW_MS;
  if (hits.size <= MAX_TRACKED_KEYS) {
    return;
  }
  for (const [key, timestamps] of hits) {
    if (timestamps.every((t) => t <= windowStart)) {
      hits.delete(key);
    }
  }
}

/** Sliding-window check. Records the attempt when allowed. */
export function checkRateLimit(key: string, now: number = Date.now()): RateLimitDecision {
  prune(now);

  const windowStart = now - WINDOW_MS;
  const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= MAX_REQUESTS) {
    hits.set(key, timestamps);
    const oldest = timestamps[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
    };
  }

  timestamps.push(now);
  hits.set(key, timestamps);

  return {
    allowed: true,
    remaining: MAX_REQUESTS - timestamps.length,
    retryAfterSeconds: 0,
  };
}

/** Stable per-caller key (first forwarded IP, else a shared bucket). */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const candidate = forwarded?.split(",")[0]?.trim();
  return candidate !== undefined && candidate.length > 0 ? candidate : "anonymous";
}
