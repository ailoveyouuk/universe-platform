-- Universe - add row-level security to quality_complaint_documents and tender_approval_role_limits (2026-10-24). Run once in the Azure portal query editor against the 'universe' database, AFTER Deploy API has applied the migrations.
-- Idempotent: skips any table already covered. Expected result: 3 and 3.
IF NOT EXISTS (
  SELECT 1 FROM sys.security_predicates sp
  JOIN sys.security_policies pol ON pol.object_id = sp.object_id
  WHERE pol.name = 'TenantAccessPolicy' AND sp.target_object_id = OBJECT_ID('dbo.quality_complaint_documents')
)
BEGIN
  ALTER SECURITY POLICY rls.TenantAccessPolicy
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.quality_complaint_documents,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.quality_complaint_documents AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.quality_complaint_documents AFTER UPDATE;
END
SELECT COUNT(*) AS predicates_on_quality_complaint_documents FROM sys.security_predicates WHERE target_object_id = OBJECT_ID('dbo.quality_complaint_documents');
IF NOT EXISTS (
  SELECT 1 FROM sys.security_predicates sp
  JOIN sys.security_policies pol ON pol.object_id = sp.object_id
  WHERE pol.name = 'TenantAccessPolicy' AND sp.target_object_id = OBJECT_ID('dbo.tender_approval_role_limits')
)
BEGIN
  ALTER SECURITY POLICY rls.TenantAccessPolicy
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_approval_role_limits,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_approval_role_limits AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_approval_role_limits AFTER UPDATE;
END
SELECT COUNT(*) AS predicates_on_tender_approval_role_limits FROM sys.security_predicates WHERE target_object_id = OBJECT_ID('dbo.tender_approval_role_limits');
