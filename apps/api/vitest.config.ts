import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/setup.ts"],
    // Shares one "local-dev" oid across every test in the file (see
    // entra-auth.guard.ts local-dev fallback) — tests clean up their own
    // user rows, but running sequentially keeps that trivially correct.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
