import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    setupFiles: ["test/setup.ts"],
    // RLS tests hit a real (containerized) SQL Server sequentially on
    // purpose — session context is connection-scoped, so parallel test
    // files racing on the same tables would be flaky, not a real bug.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
