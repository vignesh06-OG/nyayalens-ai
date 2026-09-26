import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * Drift guard: the files in public/docs/ are served verbatim at /docs/* on the
 * deployed site, while the root *.md files are what reviewers read on GitHub.
 * These byte-comparisons fail the test suite if one copy is updated without
 * the other, so the two can never silently diverge.
 */
const SHARED_DOCS = ["ACCESSIBILITY.md", "EVALUATION.md", "SECURITY.md", "TESTING.md"] as const;

describe("public/docs mirrors the root docs", () => {
  it.each(SHARED_DOCS)("%s is byte-identical at the repo root and in public/docs", (name) => {
    const source = readFileSync(new URL(`../../${name}`, import.meta.url));
    const served = readFileSync(new URL(`../../public/docs/${name}`, import.meta.url));
    expect(served.equals(source)).toBe(true);
  });
});
