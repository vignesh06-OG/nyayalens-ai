import { describe, expect, it } from "vitest";

import { DEFAULT_MAX_LENGTH, sanitizeText } from "@/lib/security/sanitize";

describe("sanitizeText", () => {
  it("strips HTML tags", () => {
    const dirty = '<script>alert("xss")</script>Dear <b>Tenant</b>';
    const clean = sanitizeText(dirty);
    expect(clean).not.toContain("<script>");
    expect(clean).not.toContain("<b>");
    expect(clean).toContain("Dear");
    expect(clean).toContain("Tenant");
  });

  it("strips inline event handlers with their tags", () => {
    const clean = sanitizeText('<img src=x onerror="steal()">clause text');
    expect(clean).not.toContain("onerror");
    expect(clean).toContain("clause text");
  });

  it("caps length at the requested maximum", () => {
    const clean = sanitizeText("a".repeat(50), 10);
    expect(clean.length).toBeLessThanOrEqual(10);
  });

  it("exports a 50k default cap", () => {
    expect(DEFAULT_MAX_LENGTH).toBe(50_000);
    expect(sanitizeText("x".repeat(60_000)).length).toBe(DEFAULT_MAX_LENGTH);
  });

  it("keeps plain legal text intact", () => {
    const text = "The Tenant shall pay Rs 25,000 on or before the 5th of each month.";
    expect(sanitizeText(text)).toBe(text);
  });

  it("handles the empty string", () => {
    expect(sanitizeText("")).toBe("");
  });
});
