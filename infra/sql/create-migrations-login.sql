-- =============================================================================
-- Universe Platform — dedicated login for running schema migrations in CI
-- =============================================================================
-- Added 2026-10-02, alongside deploy-api.yml's new "Apply database
-- migrations" step (prisma migrate deploy) — see architecture-decisions.md,
-- "CI: production database migrations were never running" for the full
-- story of why that step exists.
--
-- This project already has two logins and was careful to keep them narrow:
--   - sqlAdminLogin (infra/bicep/main.bicep) — full server-level admin,
--     reserved for migrations/break-glass only, never used day to day.
--   - universe_api_app (infra/sql/create-app-login.sql) — db_datareader +
--     db_datawriter ONLY, deliberately no DDL rights at all, so the
--     always-on internet-facing API container can never alter schema or
--     disable the RLS security policy even if compromised.
--
-- Putting the full sqlAdminLogin/sqlAdminPassword into a GitHub Actions
-- secret (so deploy-api.yml's new migration step can run `prisma migrate
-- deploy`) would work, but hands a CI pipeline the same unrestricted
-- server-admin credential used for break-glass access — a bigger blast
-- radius than the one task (running already-committed, already-reviewed
-- migration SQL) actually needs. This script creates a THIRD login instead,
-- scoped to exactly that:
--
--   db_ddladmin     — can run CREATE/ALTER/DROP TABLE and the other DDL
--                     every migration.sql in this repo consists of. Cannot
--                     read or write a single row of actual tenant data.
--   db_datareader,
--   db_datawriter   — needed only so `prisma migrate deploy` can read and
--                     write Prisma's own bookkeeping table
--                     (_prisma_migrations — NOT RLS-protected, it's
--                     Prisma's internal history table, not tenant data) to
--                     track which migrations have already run. This is the
--                     same reason universe_api_app's existing
--                     db_datareader/db_datawriter membership was enough for
--                     `prisma migrate resolve --applied` throughout this
--                     project's history (see backend-launch-checklist.md).
--
-- Still NOT db_owner, and still no access to `universe-insights` (the
-- separate insights database) or `master` — same contained-user pattern as
-- create-app-login.sql, for the same portal/Query-editor reasons documented
-- there.
--
-- HOW TO RUN THIS (do this yourself — it needs the real admin password,
-- which must never be typed into chat or a form; see repo-wide secret-
-- handling rule):
--   1. Open this file and replace {MIGRATIONS_LOGIN_PASSWORD} below with a
--      freshly generated strong password, different from universe_api_app's
--      — do this in your own editor, not here. Must satisfy SQL Server's
--      password complexity policy (upper + lower + digit + symbol, 8+
--      chars) or the CREATE USER statement will fail.
--   2. Connect to the `universe` database as the admin login (Azure Portal
--      Query editor (preview), or sqlcmd/mssql-cli/Azure Data Studio with
--      sqlAdminLogin/sqlAdminPassword) and run the whole script below.
--   3. Build the connection string with THIS user's credentials:
--      sqlserver://<server>.database.windows.net:1433;database=universe;user=universe_migrations;password=<the password from step 1>;encrypt=true;trustServerCertificate=true
--   4. Set that as the GitHub repository secret `DATABASE_URL`
--      (Settings → Secrets and variables → Actions → DATABASE_URL) — this
--      is a DIFFERENT value from Key Vault's `database-url` secret, which
--      stays on universe_api_app's unprivileged connection string and is
--      never touched by this change.
--   5. Store the password itself only in your own secret manager — do not
--      leave it sitting in a copy of this file with the placeholder filled
--      in, and never paste it into chat.
--
-- Idempotent: safe to re-run (e.g. to rotate — drop/recreate — the user).
-- =============================================================================

IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'universe_migrations')
    DROP USER universe_migrations;

CREATE USER universe_migrations WITH PASSWORD = N'{MIGRATIONS_LOGIN_PASSWORD}';

ALTER ROLE db_ddladmin ADD MEMBER universe_migrations;
ALTER ROLE db_datareader ADD MEMBER universe_migrations;
ALTER ROLE db_datawriter ADD MEMBER universe_migrations;

-- Deliberately NOT db_owner — this user can create/alter/drop schema
-- objects (needed for prisma migrate deploy) and read/write
-- _prisma_migrations, but has no elevated server-level rights, no access to
-- other databases, and (same as universe_api_app) is still subject to RLS
-- for any tenant-data table it happens to touch — not that `prisma migrate
-- deploy` ever reads/writes tenant data itself, only schema and its own
-- bookkeeping table.
GO

-- ---------------------------------------------------------------------------
-- Verification — run as universe_migrations (e.g. connect the Query editor,
-- or a temporary sqlcmd session, with these exact credentials against the
-- `universe` database) after step 3 of the walkthrough above:
--   SELECT SESSION_USER;                              -- expect universe_migrations
--   CREATE TABLE dbo.__migrations_login_check (id INT); -- expect Succeeded
--   DROP TABLE dbo.__migrations_login_check;            -- clean up the probe table
-- ---------------------------------------------------------------------------
