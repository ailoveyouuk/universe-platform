-- =============================================================================
-- Universe Platform — Azure SQL Row-Level Security (RLS)
-- =============================================================================
-- Second, independent enforcement layer for tenant isolation. The
-- application layer (apps/api/src/common/tenant-scoped.ts) already scopes
-- every query by organizationId; this script makes the database itself
-- refuse to return or write a row outside the caller's organization, even if
-- a future API bug forgets to apply tenantScope(). Both layers must hold
-- independently — see packages/db/prisma/schema.prisma header comment.
--
-- HOW THE APP MUST USE THIS (read before wiring up a real connection):
-- RLS here reads from SESSION_CONTEXT, which is per-connection, not
-- per-request. Every request must set it, on the SAME connection it then
-- runs its queries on, before touching any tenant-scoped table:
--
--   EXEC sp_set_session_context @key = N'organizationId', @value = @orgId, @read_only = 1;
--
-- With Prisma's pooled connections this means wrapping each request in
-- prisma.$transaction(...) so the session-context call and the queries that
-- follow share one connection — see packages/db/src/tenant-context.ts
-- (withTenantContext / withPlatformStaffContext) for the helper that does
-- this. A query run without first setting organizationId sees/writes NO
-- rows in any tenant-scoped table — RLS here defaults to deny, not allow.
--
-- Platform-staff cross-tenant access (e.g. an Admin-app "all organizations"
-- view) is a DELIBERATE, separately-flagged bypass — see
-- withPlatformStaffContext — never something a normal request path can
-- trigger by accident.
--
-- This script is idempotent: safe to run again after a schema change (it
-- drops and recreates the policy and predicate function first).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Idempotent teardown, in dependency order (policy depends on the
--    function; SQL Server won't let you drop the function while any policy
--    still references it).
-- ---------------------------------------------------------------------------
IF EXISTS (SELECT 1 FROM sys.security_policies WHERE name = 'TenantAccessPolicy' AND schema_id = SCHEMA_ID('rls'))
    DROP SECURITY POLICY rls.TenantAccessPolicy;

IF OBJECT_ID('rls.fn_tenantAccessPredicate', 'IF') IS NOT NULL
    DROP FUNCTION rls.fn_tenantAccessPredicate;

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'rls')
    EXEC('CREATE SCHEMA rls');
GO

-- ---------------------------------------------------------------------------
-- 1. Predicate function — one rule, reused for every table below.
--
-- A row is visible/writable when ANY of:
--   a) its organizationId is NULL — only true for the small set of
--      platform-level Role templates every org can clone from (see
--      Role.organizationId in schema.prisma). Global reference data, not a
--      tenant-isolation gap.
--   b) its organizationId matches the caller's session context.
--   c) the connection has been explicitly flagged as platform staff for
--      this transaction (withPlatformStaffContext) — the one sanctioned
--      cross-tenant path.
--
-- No session context set at all (organizationId and isPlatformStaff both
-- NULL) satisfies none of these for a non-null organizationId row, which is
-- the deliberate default-deny behaviour described above.
-- ---------------------------------------------------------------------------
CREATE FUNCTION rls.fn_tenantAccessPredicate(@OrganizationId NVARCHAR(450))
    RETURNS TABLE
    WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS fn_accessResult
    WHERE
        @OrganizationId IS NULL
        OR @OrganizationId = CONVERT(NVARCHAR(450), SESSION_CONTEXT(N'organizationId'))
        OR CONVERT(NVARCHAR(10), SESSION_CONTEXT(N'isPlatformStaff')) = N'1';
GO

-- ---------------------------------------------------------------------------
-- 2. Security policy — FILTER (SELECT/UPDATE/DELETE) + BLOCK (INSERT/UPDATE)
--    predicates on every table carrying organizationId directly. Table list
--    generated from the schema.prisma organizationId audit, 2026-09-24:
--      users, roles, partners, contacts, projects, project_lines,
--      supplier_enquiries, project_documents, product_lines,
--      product_price_history, data_sharing_consents
--    NOT included, and deliberately so: product_master (shared reference
--    catalog, not tenant-scoped — see schema.prisma "PRODUCT CLASSIFICATION"
--    comment) and regions/countries (global reference data).
--
-- BLOCK PREDICATE ... AFTER INSERT stops a caller writing a row into
-- another org (or with no session context at all). BLOCK PREDICATE ...
-- AFTER UPDATE stops a caller re-pointing an existing row at another org.
-- There is deliberately no BLOCK ... ON DELETE — the FILTER predicate
-- already hides other orgs' rows from DELETE, so there's nothing extra to
-- block there.
-- ---------------------------------------------------------------------------
CREATE SECURITY POLICY rls.TenantAccessPolicy
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.users,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.users AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.users AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.roles,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.roles AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.roles AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.partners,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.partners AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.partners AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.contacts,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.contacts AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.contacts AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.projects,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.projects AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.projects AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.project_lines,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.project_lines AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.project_lines AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.supplier_enquiries,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.supplier_enquiries AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.supplier_enquiries AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.project_documents,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.project_documents AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.project_documents AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.product_lines,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.product_lines AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.product_lines AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.product_price_history,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.product_price_history AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.product_price_history AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.data_sharing_consents,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.data_sharing_consents AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.data_sharing_consents AFTER UPDATE
WITH (STATE = ON);
GO

-- ---------------------------------------------------------------------------
-- 3. Verification queries — run these manually after applying, or use
--    packages/db/test/tenant-isolation.test.ts for the automated version.
-- ---------------------------------------------------------------------------
-- No session context set at all — every tenant-scoped table should return
-- zero rows even though the tables have data:
--   SELECT COUNT(*) FROM dbo.projects;                          -- expect 0
--
-- Session context set to a real org — only that org's rows appear:
--   EXEC sp_set_session_context @key = N'organizationId', @value = N'<org-a-id>';
--   SELECT COUNT(*) FROM dbo.projects;                          -- expect org A's count only
--
-- Platform-staff flag — sees everything, in every org:
--   EXEC sp_set_session_context @key = N'isPlatformStaff', @value = 1;
--   SELECT COUNT(*) FROM dbo.projects;                          -- expect the true total
-- ---------------------------------------------------------------------------
