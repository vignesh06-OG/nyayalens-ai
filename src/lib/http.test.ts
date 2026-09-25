import { describe, expect, it } from "vitest";

import { applySecurityHeaders, jsonError, jsonOk, type ApiFailure, type ApiSuccess } from "@/lib/http";

describe("jsonOk", () => {
  it("wraps data in { ok: true, data } with status 200", async () => {
    const res = jsonOk({ x: 1 });
    expect(res.status).toBe(200);
    const body = (await res.json()) as ApiSuccess<{ x: number }>;
    expect(body.ok).toBe(true);
    expect(body.data).toEqual({ x: 1 });
  });

  it("honors a custom status", () => {
    expect(jsonOk(null, 201).status).toBe(201);
  });
});

describe("jsonError", () => {
  it("wraps the message in { ok: false, error } with a status", async () => {
    const res = jsonError("bad", 400);
    expect(res.status).toBe(400);
    const body = (await res.json()) as ApiFailure;
    expect(body.ok).toBe(false);
    expect(body.error).toBe("bad");
  });

  it("attaches extra headers (e.g. Retry-After)", () => {
    const res = jsonError("slow down", 429, [{ key: "Retry-After", value: "60" }]);
    expect(res.headers.get("Retry-After")).toBe("60");
  });
});

describe("applySecurityHeaders", () => {
  it("returns the same response instance with hardening headers", () => {
    const base = new Response("body");
    const wrapped = applySecurityHeaders(base);
    expect(wrapped).toBe(base);
    expect(wrapped.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(wrapped.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(wrapped.headers.get("Permissions-Policy")).toContain("camera=()");
  });
});
