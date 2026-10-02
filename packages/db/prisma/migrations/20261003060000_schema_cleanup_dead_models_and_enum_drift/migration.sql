BEGIN TRAN;

-- Drop ProjectFieldGroup — confirmed dead/unused schema (no DTO, service,
-- controller, type or seed data anywhere; the status->field-visibility
-- logic it was meant to drive is implemented as hardcoded config in
-- ProjectDetailView.tsx instead). Part of the 2026-10-03 schema audit
-- cleanup.
DROP TABLE [dbo].[project_field_groups];

-- Align CertificationType's FINANCIAL_CREDIT_CHECK with
-- PartnerCompanyCheckType's FINANCIAL_CREDIT_STATUS — both enums
-- represent the same real-world document/check, independently spelled.
-- No PartnerCertification rows are expected to hold the old value yet
-- (feature is barely a day old), but this UPDATE is here so the rename
-- is safe even if one was created.
UPDATE [dbo].[partner_certifications] SET [type] = 'FINANCIAL_CREDIT_STATUS' WHERE [type] = 'FINANCIAL_CREDIT_CHECK';

COMMIT TRAN;
