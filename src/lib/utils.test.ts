import { describe, expect, it } from "vitest";

import { cn, sectionAfter } from "@/lib/utils";

describe("cn", () => {
  it("joins class fragments", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("skips falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("merges conflicting tailwind classes (last wins)", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("dedupes identical classes", () => {
    expect(cn("p-2", "p-2")).toBe("p-2");
  });

  it("supports conditional objects", () => {
    expect(cn({ hidden: false, flex: true })).toBe("flex");
  });
});

describe("sectionAfter", () => {
  const text = "intro PARTY A PERSPECTIVE: a-side text\nmore PARTY B PERSPECTIVE: b-side text";

  it("returns empty string before the start marker appears", () => {
    expect(sectionAfter("partial str", "PARTY A PERSPECTIVE:", null)).toBe("");
  });

  it("extracts through the end marker", () => {
    expect(sectionAfter(text, "PARTY A PERSPECTIVE:", "PARTY B PERSPECTIVE:")).toBe(
      "a-side text\nmore",
    );
  });

  it("extracts to end when end marker is null", () => {
    expect(sectionAfter(text, "PARTY B PERSPECTIVE:", null)).toBe("b-side text");
  });

  it("grows as a stream accumulates", () => {
    const start = "🎯 Recommended Action:";
    expect(sectionAfter(start, start, null)).toBe("");
    expect(sectionAfter(`${start} Send the notice`, start, null)).toBe("Send the notice");
  });

  it("returns empty string when the end marker is absent but end is required", () => {
    expect(sectionAfter("only start HERE: body", "HERE:", "NEVER:")).toBe("body");
  });
});
