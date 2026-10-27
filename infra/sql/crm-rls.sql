-- Universe — CRM Row-Level Security
-- Added 2026-10-26 (CRM step 1; design: docs/CRM-APP-DESIGN.md). Run AFTER row-level-security.sql (reuses rls.fn_tenantAccessPredicate)
-- and AFTER the migration that creates crm_relationships. Idempotent. Plain tenant isolation: a relationship record belongs to one
-- organisation and is never shared. Step 3 adds crm_interactions step 4 adds the contact profile, privacy request, suppression and access log tables and step 5 adds crm_opportunities and step 6 adds crm_tags, crm_relationship_tags, crm_saved_filters, crm_locations and crm_links and the pipeline history crm_opportunity_events and crm_opportunity_participants (2026-10-27) to this same policy (re-run the whole file; it drops and recreates the policy). Later CRM steps add their tables here too.

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
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_relationship_tags AFTER UPDATE,
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_saved_filters,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_saved_filters AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_saved_filters AFTER UPDATE,
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_locations,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_locations AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_locations AFTER UPDATE,
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_gift_policies,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_gift_policies AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_gift_policies AFTER UPDATE,
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_hospitality_records,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_hospitality_records AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_hospitality_records AFTER UPDATE,
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_links,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_links AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_links AFTER UPDATE,
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_opportunity_events,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_opportunity_events AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_opportunity_events AFTER UPDATE,
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_opportunity_participants,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_opportunity_participants AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.crm_opportunity_participants AFTER UPDATE
    WITH (STATE = ON);
GO
