-- Universe - add row-level security to network_saved_searches (2026-10-23). Run once in the Azure portal query editor against the 'universe' database, AFTER Deploy API has applied the migration.
-- Idempotent: does nothing if the table is already covered.
IF NOT EXISTS (
  SELECT 1 FROM sys.security_predicates sp
  JOIN sys.security_policies pol ON pol.object_id = sp.object_id
  WHERE pol.name = 'TenantAccessPolicy' AND sp.target_object_id = OBJECT_ID('dbo.network_saved_searches')
)
BEGIN
  ALTER SECURITY POLICY rls.TenantAccessPolicy
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.network_saved_searches,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.network_saved_searches AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.network_saved_searches AFTER UPDATE;
END
SELECT COUNT(*) AS predicates_on_network_saved_searches FROM sys.security_predicates WHERE target_object_id = OBJECT_ID('dbo.network_saved_searches');
