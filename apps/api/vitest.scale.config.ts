import { defineConfig } from "vitest/config";

// Scale measurement run (2026-10-17) — NOT part of the normal test suite.
// Run via the "Scale test" GitHub workflow against a throwaway database.
export default defineConfig({
  test: {
    include: ["scale/**/*.test.ts"],
    setupFiles: ["test/setup.ts"],
    fileParallelism: false,
    testTimeout: 3_600_000,
    hookTimeout: 3_600_000,
  },
});
