-- =============================================================================
-- Universe Platform — dedicated, read-only SQL user for the API's access to
-- the separate `universe-insights` database
-- =============================================================================
-- Companion to create-app-login.sql, which deliberately scoped
-- universe_api_app to the `universe` database only and explicitly left
-- universe-insights with no app-level user at all, on the stated grounds
-- that "nothing in apps/api currently connects to it, so it gets no user
-- here — revisit if/when the API itself ever needs to read it directly."
--
-- That day arrived 2026-10-09: apps/api's logistics-insights and
-- product-sourcing-insights modules both read from @universe/insights-db
-- (the Logistics & CO2 global benchmark map and the Product Database
-- sourcing map). The Container App's INSIGHTS_DATABASE_URL was temporarily
-- wired up using the server admin login (universeadmin) to unblock those
-- features immediately — this script replaces that with a properly scoped,
-- lower-privilege login, the same way universe_api_app already replaced the
-- admin login for the main `universe` database.
--
-- db_datareader ONLY — no db_datawriter. apps/api's own code (packages/
-- insights-db/src/query.ts, used by LogisticsInsightsService and
-- ProductSourcingInsightsService) only ever SELECTs from this database; all
-- writes happen through the separate aggregate-etl.ts pipeline, run
-- manually/locally (`npm run aggregate:logistics`, `aggregate:product-
-- sourcing`) with its own INSIGHTS_DATABASE_URL, which stays on your local
-- machine and is not this login. Giving the always-on, internet-facing API
-- container write access it will never use would be a pure downside.
--
-- NO Row-Level Security consideration here, unlike universe_api_app on the
-- main database: universe-insights holds only already-anonymized,
-- cross-tenant aggregate rows with no organizationId column at all (see
-- packages/insights-db/prisma/schema.prisma's header comment) — there is no
-- per-tenant row set to restrict, by design. db_datareader's table-level
-- SELECT grant is the whole access model here.
--
-- A CONTAINED DATABASE USER, same reasoning as create-app-login.sql's own
-- note on this: authenticates directly against universe-insights with no
-- corresponding server-level login, and sidesteps the Azure Portal Query
-- editor's one-pane-per-database limitation.
--
-- HOW TO RUN THIS (do this yourself — it needs the real admin password,
-- which must never be typed into chat or a form; see repo-wide secret-
-- handling rule):
--   1. Connect to the `universe-insights` database (NOT `universe` — this
--      is the separate insights database) as the admin login (Azure Portal
--      Query editor (preview), or sqlcmd/mssql-cli/Azure Data Studio with
--      sqlAdminLogin/sqlAdminPassword) and run the whole script below.
--   2. Build the connection string with this new login's credentials:
--        sqlserver://universe-pilot-sql.database.windows.net:1433;database=universe-insights;user=universe_insights_app;password=<the password below>;encrypt=true;trustServerCertificate=true
--      and set it as:
--        a) Key Vault's `insights-database-url` secret (infra/bicep/modules/
--           containerApp.bicep now references this — see its 2026-10-09
--           comment), for the next real Deploy Infrastructure run to pick
--           up, AND
--        b) the Container App's INSIGHTS_DATABASE_URL manual env var you
--           already set (Containers → Edit and deploy → Environment
--           variables), replacing the admin-login value with this one, then
--           Save → Create to deploy a new revision — this is what actually
--           takes effect immediately, before any infra redeploy.
--   3. Store the password itself only in your own secret manager (or the
--      Key Vault connection string you just set) — do not leave it sitting
--      in a copy of this file.
--
-- Idempotent: safe to re-run (e.g. to rotate — drop/recreate — the user).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Contained database user + role membership. Run against the
-- `universe-insights` database — this is the only database this script
-- touches.
-- ---------------------------------------------------------------------------
IF EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'universe_insights_app')
    DROP USER universe_insights_app;

CREATE USER universe_insights_app WITH PASSWORD = N'vtosjk2-Jkfqxk-nhmmfq';

ALTER ROLE db_datareader ADD MEMBER universe_insights_app;

-- Deliberately NOT db_datawriter / db_owner / db_ddladmin — read-only, per
-- the comment above. No CREATE/ALTER/DROP, no INSERT/UPDATE/DELETE.
GO

-- ---------------------------------------------------------------------------
-- Verification — run as universe_insights_app (e.g. connect the Query
-- editor, or a temporary sqlcmd session, with these exact credentials
-- against the `universe-insights` database) after step 2 of the walkthrough
-- above:
--   SELECT SESSION_USER;                               -- expect universe_insights_app
--   SELECT COUNT(*) FROM dbo.aggregated_logistics_metrics;  -- expect success, a real count
--   INSERT INTO dbo.aggregated_logistics_metrics (id) VALUES ('x');  -- expect
--                                                        -- a permission error
--                                                        -- (no db_datawriter)
-- ---------------------------------------------------------------------------
