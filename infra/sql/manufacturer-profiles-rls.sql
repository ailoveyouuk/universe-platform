-- Universe - add row-level security to manufacturer_profiles (2026-10-23). Run once in the Azure portal query editor against the 'universe' database.
-- Idempotent: does nothing if the table is already covered. Same predicate as every other organisation-owned table.
IF NOT EXISTS (
  SELECT 1 FROM sys.security_predicates sp
  JOIN sys.security_policies pol ON pol.object_id = sp.object_id
  WHERE pol.name = 'TenantAccessPolicy' AND sp.target_object_id = OBJECT_ID('dbo.manufacturer_profiles')
)
BEGIN
  ALTER SECURITY POLICY rls.TenantAccessPolicy
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.manufacturer_profiles,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.manufacturer_profiles AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.manufacturer_profiles AFTER UPDATE;
END
GO
SELECT COUNT(*) AS predicates_on_manufacturer_profiles FROM sys.security_predicates WHERE target_object_id = OBJECT_ID('dbo.manufacturer_profiles');
