// vitest setupFile — points the shared PrismaClient singleton (src/index.ts)
// at the test database instead of whatever DATABASE_URL is set to in the
// wider environment. Must run before src/index.ts is first imported by any
// test, which is why this is wired in via vitest.config.ts `setupFiles`
// rather than imported from within a test file.
if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL is not set. Run tests via `npm run test:db` from the repo root, which starts " +
      "docker-compose.test.yml and sets this automatically — don't run vitest directly against a real database.",
  );
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
