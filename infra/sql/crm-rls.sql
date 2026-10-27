-- Universe — CRM Row-Level Security
-- Added 2026-10-26 (CRM step 1; design: docs/CRM-APP-DESIGN.md). Run AFTER row-level-security.sql (reuses rls.fn_tenantAccessPredicate)
-- and AFTER the migration that creates crm_relationships. Idempotent. Plain tenant isolation: a relationship record belongs to one
-- organisation and is never shared. Step 3 adds crm_interactions step 4 adds the contact profile, privacy request, suppression and access log tables and step 5 adds crm_opportunities and step 6 adds crm_tags and crm_relationship_tags to this same policy (re-run the whole file; it drops and recreates the policy). Later CRM steps add their tables here too.

IF EXISTS (SELECT 1 FROM sys.security_policies WHERE name = 'CrmPolicy' AND schema_id = SCHEMA_ID('rls'))
    DROP SECURITY POLICY rls.CrmPolicy;
GO

CREATE SECURITY POLICY rls.CrmPolicy
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_relationships,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_relationships AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_relationships AFTER UPDATE,
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_interactions,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_interactions AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_interactions AFTER UPDATE,
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_contact_profiles,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_contact_profiles AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_contact_profiles AFTER UPDATE,
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_privacy_requests,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_privacy_requests AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_privacy_requests AFTER UPDATE,
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_suppressions,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_suppressions AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_suppressions AFTER UPDATE,
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_access_log,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_access_log AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_access_log AFTER UPDATE,
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_opportunities,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_opportunities AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_opportunities AFTER UPDATE,
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_tags,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_tags AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_tags AFTER UPDATE,
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_relationship_tags,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_relationship_tags AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_relationship_tags AFTER UPDATE
    WITH (STATE = ON);
GO
