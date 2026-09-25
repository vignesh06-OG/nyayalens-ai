import { describe, expect, it } from "vitest";

import { securityHeaders } from "@/lib/security/headers";

describe("securityHeaders", () => {
  it("exposes a non-empty list of key/value pairs", () => {
    expect(securityHeaders.length).toBeGreaterThan(0);
    for (const header of securityHeaders) {
      expect(header.key.length).toBeGreaterThan(0);
      expect(header.value.length).toBeGreaterThan(0);
    }
  });

  it("includes the core hardening headers", () => {
    const keys = securityHeaders.map((h) => h.key);
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).toContain("Strict-Transport-Security");
  });
});
