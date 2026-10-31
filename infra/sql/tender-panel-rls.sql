-- Universe — Mini-competition panel Row-Level Security
-- Added 2026-10-31. Run AFTER row-level-security.sql and AFTER migration 20261031180000_mini_competition_panel. Idempotent.
-- Plain tenant isolation: panel rows and scores belong to the issuing organisation only (suppliers never see them).

IF EXISTS (SELECT 1 FROM sys.security_policies WHERE name = 'TenderPanelPolicy' AND schema_id = SCHEMA_ID('rls'))
    DROP SECURITY POLICY rls.TenderPanelPolicy;
GO

CREATE SECURITY POLICY rls.TenderPanelPolicy
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_mini_evaluators,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_mini_evaluators AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_mini_evaluators AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_quote_scores,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_quote_scores AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_quote_scores AFTER UPDATE
    WITH (STATE = ON);
GO
