-- Universe — CRM Row-Level Security
-- Added 2026-10-26 (CRM step 1; design: docs/CRM-APP-DESIGN.md). Run AFTER row-level-security.sql (reuses rls.fn_tenantAccessPredicate)
-- and AFTER the migration that creates crm_relationships. Idempotent. Plain tenant isolation: a relationship record belongs to one
-- organisation and is never shared. Later CRM steps add their tables to this same policy.

IF EXISTS (SELECT 1 FROM sys.security_policies WHERE name = 'CrmPolicy' AND schema_id = SCHEMA_ID('rls'))
    DROP SECURITY POLICY rls.CrmPolicy;
GO

CREATE SECURITY POLICY rls.CrmPolicy
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_relationships,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_relationships AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_relationships AFTER UPDATE
    WITH (STATE = ON);
GO
