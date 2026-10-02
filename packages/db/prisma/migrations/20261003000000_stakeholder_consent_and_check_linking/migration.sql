BEGIN TRAN;

-- Stakeholder consent toggle + company-check/document linking (2026-10-03).
-- See Partner.sharedWithUniverseRegistry, PartnerCompanyCheck.customLabel
-- and PartnerCertification.relatedCompanyCheckType's doc comments in
-- schema.prisma, and the New Stakeholder form's redesigned "Add Check" UI.

-- AlterTable: partners — explicit, off-by-default consent to share this
-- stakeholder's generic identity fields with the cross-tenant registry.
ALTER TABLE [dbo].[partners] ADD
    [sharedWithUniverseRegistry] BIT NOT NULL CONSTRAINT [partners_sharedWithUniverseRegistry_df] DEFAULT 0;

-- AlterTable: partner_company_checks — free-text label for an "OTHER"
-- check not on the predefined list.
ALTER TABLE [dbo].[partner_company_checks] ADD
    [customLabel] NVARCHAR(1000);

-- AlterTable: partner_certifications — optional link from a document to
-- the specific company check it evidences (e.g. a VAT Certificate upload
-- related to the "VAT Certificate" check).
ALTER TABLE [dbo].[partner_certifications] ADD
    [relatedCompanyCheckType] NVARCHAR(1000);

COMMIT TRAN;
