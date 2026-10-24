-- Universe — Quality complaints and scorecard settings Row-Level Security
-- Added 2026-10-20. Run AFTER row-level-security.sql (reuses rls.fn_tenantAccessPredicate) and AFTER the migration that
-- creates the complaint tables. Idempotent. Plain tenant isolation: every complaint row belongs to one organisation.

IF EXISTS (SELECT 1 FROM sys.security_policies WHERE name = 'QualityComplaintPolicy' AND schema_id = SCHEMA_ID('rls'))
    DROP SECURITY POLICY rls.QualityComplaintPolicy;
GO

CREATE SECURITY POLICY rls.QualityComplaintPolicy
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.quality_complaints,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.quality_complaints AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.quality_complaints AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.quality_complaint_events,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.quality_complaint_events AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.quality_complaint_events AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.quality_complaint_actions,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.quality_complaint_actions AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.quality_complaint_actions AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.quality_complaint_documents,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.quality_complaint_documents AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.quality_complaint_documents AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.quality_scorecard_settings,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.quality_scorecard_settings AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.quality_scorecard_settings AFTER UPDATE
    WITH (STATE = ON);
GO
