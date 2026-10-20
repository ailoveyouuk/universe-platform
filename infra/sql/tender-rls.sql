-- Universe — Tender Issuance & Management Row-Level Security
-- Added 2026-10-19 (step 1a; design: docs/TENDER-APP-DESIGN.md section 7). Run AFTER row-level-security.sql and AFTER the
-- migration that creates the tender tables. Idempotent.
--
-- Tenders need rows that more than one organisation may read, while only the owner writes. Three read rules, all enforced
-- by the database as well as the API (an API bug cannot widen access):
--   1. tenders: the issuer, platform staff, or any organisation with a session once the tender is PUBLISHED and either visible
--      to all registered organisations or the organisation holds an invitation. Drafts are visible to the issuer only.
--   2. tender child tables (lines, criteria, eligibility rules, documents, public clarifications): the issuer, staff, or
--      anyone who can see the parent tender (the parent's own policy is applied inside the EXISTS).
--   3. two-party rows (invitations, participations, eligibility checks, questions, events): the owner, or the named
--      counterparty. A release time can be passed for sealed rows (used by bids in step 3: the issuer cannot read a bid
--      before the closing time, even through a bug).
-- Writes: only the owner (the same tenant predicate used everywhere), except tender_events, which either party may append.

IF EXISTS (SELECT 1 FROM sys.security_policies WHERE name = 'TenderAccessPolicy' AND schema_id = SCHEMA_ID('rls'))
    DROP SECURITY POLICY rls.TenderAccessPolicy;
IF OBJECT_ID('rls.fn_tenderReadPredicate', 'IF') IS NOT NULL DROP FUNCTION rls.fn_tenderReadPredicate;
IF OBJECT_ID('rls.fn_tenderChildReadPredicate', 'IF') IS NOT NULL DROP FUNCTION rls.fn_tenderChildReadPredicate;
IF OBJECT_ID('rls.fn_twoPartyReadPredicate', 'IF') IS NOT NULL DROP FUNCTION rls.fn_twoPartyReadPredicate;
IF OBJECT_ID('rls.fn_twoPartyWritePredicate', 'IF') IS NOT NULL DROP FUNCTION rls.fn_twoPartyWritePredicate;
GO

CREATE FUNCTION rls.fn_tenderReadPredicate(@OrganizationId NVARCHAR(450), @IsPublished BIT, @VisibleToAll BIT, @TenderId NVARCHAR(450))
    RETURNS TABLE
    WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS fn_accessResult
    WHERE
        @OrganizationId = CONVERT(NVARCHAR(450), SESSION_CONTEXT(N'organizationId'))
        OR CONVERT(NVARCHAR(10), SESSION_CONTEXT(N'isPlatformStaff')) = N'1'
        OR (
            @IsPublished = 1
            AND SESSION_CONTEXT(N'organizationId') IS NOT NULL
            AND (
                @VisibleToAll = 1
                OR EXISTS (
                    SELECT 1 FROM dbo.tender_invitations i
                    WHERE i.tenderId = @TenderId
                      AND i.invitedOrganizationId = CONVERT(NVARCHAR(450), SESSION_CONTEXT(N'organizationId'))
                )
            )
        );
GO

CREATE FUNCTION rls.fn_tenderChildReadPredicate(@OrganizationId NVARCHAR(450), @TenderId NVARCHAR(450))
    RETURNS TABLE
    WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS fn_accessResult
    WHERE
        @OrganizationId = CONVERT(NVARCHAR(450), SESSION_CONTEXT(N'organizationId'))
        OR CONVERT(NVARCHAR(10), SESSION_CONTEXT(N'isPlatformStaff')) = N'1'
        OR EXISTS (SELECT 1 FROM dbo.tenders t WHERE t.id = @TenderId);
GO

CREATE FUNCTION rls.fn_twoPartyReadPredicate(@OwnerOrganizationId NVARCHAR(450), @CounterpartyOrganizationId NVARCHAR(450), @ReleaseAt DATETIME2)
    RETURNS TABLE
    WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS fn_accessResult
    WHERE
        @OwnerOrganizationId = CONVERT(NVARCHAR(450), SESSION_CONTEXT(N'organizationId'))
        OR CONVERT(NVARCHAR(10), SESSION_CONTEXT(N'isPlatformStaff')) = N'1'
        OR (
            @CounterpartyOrganizationId = CONVERT(NVARCHAR(450), SESSION_CONTEXT(N'organizationId'))
            AND (@ReleaseAt IS NULL OR @ReleaseAt <= SYSUTCDATETIME())
        );
GO

CREATE FUNCTION rls.fn_twoPartyWritePredicate(@OwnerOrganizationId NVARCHAR(450), @CounterpartyOrganizationId NVARCHAR(450))
    RETURNS TABLE
    WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS fn_accessResult
    WHERE
        @OwnerOrganizationId = CONVERT(NVARCHAR(450), SESSION_CONTEXT(N'organizationId'))
        OR @CounterpartyOrganizationId = CONVERT(NVARCHAR(450), SESSION_CONTEXT(N'organizationId'))
        OR CONVERT(NVARCHAR(10), SESSION_CONTEXT(N'isPlatformStaff')) = N'1';
GO

CREATE SECURITY POLICY rls.TenderAccessPolicy
    -- Issuer-owned, readable once published.
    ADD FILTER PREDICATE rls.fn_tenderReadPredicate(organizationId, isPublished, visibleToAll, id) ON dbo.tenders,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tenders AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tenders AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenderChildReadPredicate(organizationId, tenderId) ON dbo.tender_lines,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_lines AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_lines AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenderChildReadPredicate(organizationId, tenderId) ON dbo.tender_criteria,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_criteria AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_criteria AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenderChildReadPredicate(organizationId, tenderId) ON dbo.tender_eligibility_rules,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_eligibility_rules AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_eligibility_rules AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenderChildReadPredicate(organizationId, tenderId) ON dbo.tender_documents,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_documents AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_documents AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenderChildReadPredicate(organizationId, tenderId) ON dbo.tender_clarifications,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_clarifications AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_clarifications AFTER UPDATE,

    -- Addenda (2026-10-19): issuer writes; anyone who can see the tender reads.
    ADD FILTER PREDICATE rls.fn_tenderChildReadPredicate(organizationId, tenderId) ON dbo.tender_addenda,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_addenda AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_addenda AFTER UPDATE,

    -- Acknowledgements: the participant writes, the issuer reads.
    ADD FILTER PREDICATE rls.fn_twoPartyReadPredicate(organizationId, issuerOrganizationId, NULL) ON dbo.tender_addendum_acks,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_addendum_acks AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_addendum_acks AFTER UPDATE,

    -- Bids (step 3): owned by the bidder, readable by the issuer as counterparty. The service keeps them sealed until closing; no other bidder can read them.
    ADD FILTER PREDICATE rls.fn_twoPartyReadPredicate(organizationId, issuerOrganizationId, NULL) ON dbo.tender_bids,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_bids AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_bids AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_twoPartyReadPredicate(organizationId, issuerOrganizationId, NULL) ON dbo.tender_bid_lines,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_bid_lines AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_bid_lines AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_twoPartyReadPredicate(organizationId, issuerOrganizationId, NULL) ON dbo.tender_bid_responses,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_bid_responses AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_bid_responses AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_twoPartyReadPredicate(organizationId, issuerOrganizationId, NULL) ON dbo.tender_bid_files,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_bid_files AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_bid_files AFTER UPDATE,

    -- Evaluation (step 4, 2026-10-20): private to the issuer.
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_evaluators,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_evaluators AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_evaluators AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_bid_gates,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_bid_gates AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_bid_gates AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_bid_scores,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_bid_scores AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_bid_scores AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_moderated_scores,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_moderated_scores AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_moderated_scores AFTER UPDATE,

    -- Awards and debriefs: the issuer writes; the awarded or debriefed bidder reads its own.
    ADD FILTER PREDICATE rls.fn_twoPartyReadPredicate(organizationId, awardedOrganizationId, NULL) ON dbo.tender_awards,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_awards AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_awards AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_twoPartyReadPredicate(organizationId, awardedOrganizationId, NULL) ON dbo.tender_award_lines,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_award_lines AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_award_lines AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_twoPartyReadPredicate(organizationId, bidderOrganizationId, NULL) ON dbo.tender_debriefs,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_debriefs AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_debriefs AFTER UPDATE,

    -- Complaints: owned by the bidder, read and answered by the issuer (the issuer's response is a write by the counterparty, so it uses the two-party write rule).
    ADD FILTER PREDICATE rls.fn_twoPartyReadPredicate(organizationId, issuerOrganizationId, NULL) ON dbo.tender_complaints,
    ADD BLOCK PREDICATE rls.fn_twoPartyWritePredicate(organizationId, issuerOrganizationId) ON dbo.tender_complaints AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_twoPartyWritePredicate(organizationId, issuerOrganizationId) ON dbo.tender_complaints AFTER UPDATE,

    -- Sanctions/debarment screening records: private to the issuer.
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_screenings,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_screenings AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_screenings AFTER UPDATE,

    -- Two-party rows: owner reads and writes; the counterparty reads.
    ADD FILTER PREDICATE rls.fn_twoPartyReadPredicate(organizationId, invitedOrganizationId, NULL) ON dbo.tender_invitations,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_invitations AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_invitations AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_twoPartyReadPredicate(organizationId, issuerOrganizationId, NULL) ON dbo.tender_participations,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_participations AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_participations AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_twoPartyReadPredicate(organizationId, issuerOrganizationId, NULL) ON dbo.tender_eligibility_checks,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_eligibility_checks AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_eligibility_checks AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_twoPartyReadPredicate(organizationId, issuerOrganizationId, NULL) ON dbo.tender_questions,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_questions AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_questions AFTER UPDATE,

    -- The audit timeline: either party appends; both read.
    ADD FILTER PREDICATE rls.fn_twoPartyReadPredicate(organizationId, counterpartyOrganizationId, NULL) ON dbo.tender_events,
    ADD BLOCK PREDICATE rls.fn_twoPartyWritePredicate(organizationId, counterpartyOrganizationId) ON dbo.tender_events AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_twoPartyWritePredicate(organizationId, counterpartyOrganizationId) ON dbo.tender_events AFTER UPDATE,

    -- Private to the owning organisation.
    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_shortlists,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_shortlists AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_shortlists AFTER UPDATE,

    ADD FILTER PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_saved_searches,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_saved_searches AFTER INSERT,
    ADD BLOCK PREDICATE rls.fn_tenantAccessPredicate(organizationId) ON dbo.tender_saved_searches AFTER UPDATE
WITH (STATE = ON);
GO
