// vitest setupFile — same rationale as packages/db/test/setup.ts: point the
// shared PrismaClient singleton at the test database before anything in
// @universe/db is imported. Run via `npm run test:db` from the repo root,
// which starts docker-compose.test.yml and sets TEST_DATABASE_URL.
if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL is not set. Run tests via `npm run test:db` from the repo root, which starts " +
      "docker-compose.test.yml and sets this automatically — don't run vitest directly against a real database.",
  );
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
