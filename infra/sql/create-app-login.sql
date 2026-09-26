-- =============================================================================
-- Universe Platform — dedicated, lower-privilege SQL user for the API
-- =============================================================================
-- `sqlAdminLogin`/`sqlAdminPassword` (infra/bicep/main.bicep, e.g.
-- "universeadmin") is the SERVER-level admin — full control over the whole
-- logical server, both databases, every login. That is deliberately never
-- what the running API connects with day to day (see modules/sql.bicep's own
-- comment: "The API connects with a separate, lower-privilege user created
-- post-deploy — this admin login is for migrations/break-glass only.").
--
-- This script creates that separate user: db_datareader + db_datawriter on
-- the `universe` database only — no DDL (no CREATE/ALTER/DROP TABLE), no
-- db_owner, no access to `universe-insights` (the separate anonymized
-- insights database — see packages/insights-db/prisma/schema.prisma and
-- architecture-decisions.md, "Anonymized cross-tenant insights"; nothing in
-- apps/api currently connects to it, so it gets no user here — revisit
-- if/when the API itself ever needs to read it directly). Schema migrations
-- (`npm run db:migrate`, which needs CREATE TABLE etc.) keep using the admin
-- login — that's a deliberately manual, human-run step, never something the
-- always-on API container does at boot.
--
-- A CONTAINED DATABASE USER, not a server login (2026-09-25 revision):
-- the original version of this script created a server-level `CREATE LOGIN`
-- (which only works connected to `master`) plus a database user mapped to
-- it. Dropped that in favor of `CREATE USER ... WITH PASSWORD` directly —
-- Azure SQL Database supports authenticating straight against a "contained"
-- database user with no corresponding server login at all. Functionally
-- equivalent for this purpose (same db_datareader/db_datawriter scoping,
-- same RLS enforcement), but it means this ENTIRE script runs in one place,
-- against the `universe` database only. That matters in practice: Azure
-- Portal's Query Editor (preview) only exposes a working query pane per
-- *user* database — `master`'s own resource blade has no Query editor menu
-- item in the current portal, a dead end hit directly while running the
-- previous version of this script. A contained user sidesteps that
-- limitation entirely rather than fighting the portal for master access.
--
-- WHY db_datareader/db_datawriter and not something narrower: Row-Level
-- Security (infra/sql/row-level-security.sql, infra/sql/supplier-directory-rls.sql)
-- is the layer that actually restricts which ROWS this login can see/write
-- within a table it has access to — that's enforced regardless of the
-- login's own role membership, including for db_datareader/db_datawriter.
-- Restricting at the role level too (e.g. per-table GRANTs) would duplicate
-- that enforcement for no real gain at this stage and would need updating
-- every time a table is added; RLS is where the tenant-isolation logic
-- already lives and is tested (packages/db/test/tenant-isolation.test.ts).
-- What db_datareader/db_datawriter DOES meaningfully block, which matters
-- given this is the credential the always-on internet-facing API runs with:
-- no CREATE/ALTER/DROP on any table, no ability to disable/alter the RLS
-- security policy itself, no access to other logins/server config.
--
-- HOW TO RUN THIS (do this yourself — it needs the real admin password,
-- which must never be typed into chat or a form; see repo-wide secret-
-- handling rule):
--   1. Open this file and replace {APP_LOGIN_PASSWORD} below with a
--      freshly generated strong password (e.g. `openssl rand -base64 24`
--      or your password manager) — do this in your own editor, not here.
--      Contained-user passwords still have to satisfy SQL Server's password
--      complexity policy (upper + lower + digit + symbol, 8+ chars) or the
--      CREATE USER statement below will fail.
--   2. Connect to the `universe` database as the admin login (Azure Portal
--      Query editor (preview), or `sqlcmd`/`mssql-cli`/Azure Data Studio
--      with sqlAdminLogin/sqlAdminPassword) and run the whole script below.
--   3. Build the app's real connection string with the app user's
--      credentials (not the admin's) and set it as Key Vault's
--      `database-url` secret yourself — see infra/README.md step 3 —
--      never pass the password through this script's output or through
--      Claude.
--   4. Store the password itself only in your own secret manager (or the
--      Key Vault connection string you just set) — do not leave it sitting
--      in a copy of this file with the placeholder filled in.
--
-- Idempotent: safe to re-run (e.g. to rotate — drop/recreate — the user).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Contained database user + role membership. Run against the `universe`
-- database — this is the only database this script touches.
-- ---------------------------------------------------------------------------
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'universe_api_app')
    DROP USER universe_api_app;

CREATE USER universe_api_app WITH PASSWORD = N'kovNy9-zivbov-wufdar';

ALTER ROLE db_datareader ADD MEMBER universe_api_app;
ALTER ROLE db_datawriter ADD MEMBER universe_api_app;

-- Deliberately NOT db_owner / db_ddladmin — this user can read and write
-- rows but cannot CREATE/ALTER/DROP tables, functions, or the RLS security
-- policy itself. Being a contained user, it also has no footprint at all
-- outside this one database — no server-level login, no access to
-- `universe-insights` or `master`.
GO

-- ---------------------------------------------------------------------------
-- Verification — run as universe_api_app (e.g. connect the Query editor, or
-- a temporary sqlcmd session, with these exact credentials against the
-- `universe` database) after step 3 of the walkthrough above:
--   SELECT SESSION_USER;                          -- expect universe_api_app
--   SELECT COUNT(*) FROM dbo.projects;             -- expect 0 (no session
--                                                   -- context set yet — RLS
--                                                   -- default-deny, same as
--                                                   -- any other login; see
--                                                   -- row-level-security.sql)
--   CREATE TABLE dbo.__should_fail (id INT);        -- expect a permission
--                                                   -- error (no CREATE TABLE)
-- ---------------------------------------------------------------------------
