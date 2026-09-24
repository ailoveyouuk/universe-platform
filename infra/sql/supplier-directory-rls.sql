-- Universe — Supplier/Manufacturer Directory Row-Level Security
-- Added 2026-09-24. Companion to row-level-security.sql, but a DELIBERATELY
-- different access model — read that file first for the tenant-isolation
-- default-deny pattern this one intentionally departs from.
--
-- WHY A SEPARATE POLICY: row-level-security.sql's rls.fn_tenantAccessPredicate
-- restricts BOTH reads and writes to the row's own organizationId (plus the
-- platform-staff bypass). That's correct for every tenant-isolated table —
-- Org A must never see Org B's projects or pricing. But the whole point of
-- the supplier/manufacturer marketplace (see architecture doc, "Supplier/
-- manufacturer marketplace", 2026-09-24) is the OPPOSITE for these three
-- tables: any authenticated organization should be able to SEARCH and READ
-- every published supplier profile/product, while only the OWNING supplier
-- organization can WRITE its own listing. Applying
-- rls.fn_tenantAccessPredicate here would make the directory invisible to
-- everyone except the supplier who owns each row — the opposite of the
-- product requirement.
--
-- supplier_leads (buyer-interest audit trail) is DELIBERATELY NOT covered by
-- this policy or any RLS policy — see its own model comment in
-- schema.prisma. It has two different organizationId-shaped columns
-- (supplierOrganizationId, buyerOrganizationId), and SQL Server ANDs
-- multiple FILTER predicates on the same table together rather than ORing
-- them, so a single-column predicate function can't express "visible to
-- either the supplier or the buyer" correctly. Reads/writes on that table
-- are authorized at the application layer instead (apps/api's
-- SupplierDirectoryService, checking caller.organizationId against both
-- columns explicitly) — the same "controlled cross-tenant access, enforced
-- in code, not RLS" pattern already used for EntraAuthGuard's identity
-- lookup (see row-level-security.sql).

-- ---------------------------------------------------------------------------
-- 1. Read predicate — true for any session with SOME organization context
--    set (a real authenticated caller, buyer or supplier) or platform staff.
--    Still denies a bare connection with NO session context at all — the
--    directory is platform-internal, not a public/unauthenticated API.
--    @OrganizationId is bound per ADD FILTER PREDICATE's column requirement
--    but deliberately unused in the body — every authenticated org sees
--    every row here, that's the point.
-- ---------------------------------------------------------------------------
CREATE FUNCTION rls.fn_supplierDirectoryReadPredicate(@OrganizationId NVARCHAR(450))
    RETURNS TABLE
    WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS fn_accessResult
    WHERE
        SESSION_CONTEXT(N'organizationId') IS NOT NULL
        OR CONVERT(NVARCHAR(10), SESSION_CONTEXT(N'isPlatformStaff')) = N'1';
GO

-- ---------------------------------------------------------------------------
-- 2. Security policy — universal FILTER (read) + owner-scoped BLOCK
--    (INSERT/UPDATE) on the three directory tables. The BLOCK predicate
--    reuses rls.fn_tenantAccessPredicate from row-level-security.sql
--    unchanged — "can this caller write this row" is still exactly the
--    normal tenant-ownership check, only the read side is different here.
-- ---------------------------------------------------------------------------
CREATE SECURITY POLICY rls.SupplierDirectoryPolicy
    ADD FILTER PREDICATE rls.fn_supplierDirectoryReadPredicate(organizationId) ON dbo.supplier_profiles,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.supplier_profiles AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.supplier_profiles AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_supplierDirectoryReadPredicate(organizationId) ON dbo.supplier_country_presence,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.supplier_country_presence AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.supplier_country_presence AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_supplierDirectoryReadPredicate(organizationId) ON dbo.supplier_products,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.supplier_products AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.supplier_products AFTER UPDATE
    WITH (STATE = ON);
GO
