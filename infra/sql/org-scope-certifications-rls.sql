-- Universe - add row-level security to organization_scope and organization_certifications (2026-10-23). Run once in the Azure portal query editor against the 'universe' database, AFTER Deploy API has applied the migration.
-- Idempotent: each table is only added if not already covered.
IF NOT EXISTS (
  SELECT 1 FROM sys.security_predicates sp
  JOIN sys.security_policies pol ON pol.object_id = sp.object_id
  WHERE pol.name = 'TenantAccessPolicy' AND sp.target_object_id = OBJECT_ID('dbo.organization_scope')
)
BEGIN
  ALTER SECURITY POLICY rls.TenantAccessPolicy
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.organization_scope,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.organization_scope AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.organization_scope AFTER UPDATE;
END
GO
IF NOT EXISTS (
  SELECT 1 FROM sys.security_predicates sp
  JOIN sys.security_policies pol ON pol.object_id = sp.object_id
  WHERE pol.name = 'TenantAccessPolicy' AND sp.target_object_id = OBJECT_ID('dbo.organization_certifications')
)
BEGIN
  ALTER SECURITY POLICY rls.TenantAccessPolicy
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.organization_certifications,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.organization_certifications AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.organization_certifications AFTER UPDATE;
END
GO
SELECT COUNT(*) AS predicates_on_new_tables FROM sys.security_predicates WHERE target_object_id IN (OBJECT_ID('dbo.organization_scope'), OBJECT_ID('dbo.organization_certifications'));
