import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/domain/**/*.ts", "src/lib/**/*.ts"],
      exclude: ["**/*.test.ts", "src/lib/security/headers.ts", "src/domain/**/types.ts"],
      thresholds: {
        statements: 98,
        functions: 98,
        lines: 98,
        branches: 90,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
