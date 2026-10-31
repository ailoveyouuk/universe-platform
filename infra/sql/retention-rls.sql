-- Universe — Retention decisions and overrides Row-Level Security
-- Added 2026-10-31. Run AFTER row-level-security.sql (reuses rls.fn_tenantAccessPredicate) and AFTER the migration
-- 20261031160000_retention_decisions. Idempotent. Plain tenant isolation: every row belongs to one organisation.

IF EXISTS (SELECT 1 FROM sys.security_policies WHERE name = 'RetentionPolicy' AND schema_id = SCHEMA_ID('rls'))
    DROP SECURITY POLICY rls.RetentionPolicy;
GO

CREATE SECURITY POLICY rls.RetentionPolicy
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.retention_decisions,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.retention_decisions AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.retention_decisions AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.retention_overrides,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.retention_overrides AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.retention_overrides AFTER UPDATE
    WITH (STATE = ON);
GO
