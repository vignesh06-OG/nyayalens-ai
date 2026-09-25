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
        statements: 95,
        functions: 95,
        lines: 95,
        branches: 87,
      },
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
