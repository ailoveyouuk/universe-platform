BEGIN TRAN;

-- Stakeholder onboarding: SOP-aligned expansion (2026-10-02).
-- See architecture-decisions.md's section of the same name for the full
-- rationale: this reworks the New Stakeholder form's backing schema to
-- match what Unimed's real SOPs (008 Supplier Management, 011 Sales, 029
-- Managing Outsourced Warehousing) and a real supplier file (Becton
-- Dickinson) actually require, rather than the minimal name/country/
-- website-level fields the per-role Detail tables held before.

-- AlterTable: partners — risk tiering + company-level identifiers +
-- generalized re-approval cadence (SOP008 §4.7.1's annual Bona Fide
-- re-check, applied to any role rather than duplicated per *Detail table).
ALTER TABLE [dbo].[partners] ADD
    [riskTier] NVARCHAR(1000),
    [companyRegistrationNumber] NVARCHAR(1000),
    [vatNumber] NVARCHAR(1000),
    [lastApprovalReviewDate] DATETIME2,
    [nextApprovalReviewDue] DATETIME2;

-- AlterTable: partner_supplier_details — scope of supply/services
-- (Bioconnections FORM 008.1) + Code of Conduct acknowledgement (SOP008
-- §4.1.12).
ALTER TABLE [dbo].[partner_supplier_details] ADD
    [scopeOfSupply] NVARCHAR(1000),
    [scopeOfServicesDescription] NVARCHAR(max),
    [codeOfConductAcknowledged] BIT NOT NULL CONSTRAINT [partner_supplier_details_codeOfConductAcknowledged_df] DEFAULT 0,
    [codeOfConductAcknowledgedDate] DATETIME2;

-- AlterTable: partner_manufacturer_details — scope of supply/services,
-- mirroring Supplier (SOP008 treats Manufacturer as a Supplier sub-type).
ALTER TABLE [dbo].[partner_manufacturer_details] ADD
    [scopeOfSupply] NVARCHAR(1000),
    [scopeOfServicesDescription] NVARCHAR(max);

-- AlterTable: partner_freight_forwarder_details — capability flags.
-- Provisional: SOP014/030 (the SOPs that actually govern this role)
-- couldn't be read as text in this build (scanned PDFs, no OCR layer) —
-- see schema.prisma's doc comment on FreightForwarderDetail.
ALTER TABLE [dbo].[partner_freight_forwarder_details] ADD
    [modesOfTransport] NVARCHAR(1000),
    [iataDgrCertified] BIT NOT NULL CONSTRAINT [partner_freight_forwarder_details_iataDgrCertified_df] DEFAULT 0,
    [aeoAccredited] BIT NOT NULL CONSTRAINT [partner_freight_forwarder_details_aeoAccredited_df] DEFAULT 0,
    [gdpTransportCapable] BIT NOT NULL CONSTRAINT [partner_freight_forwarder_details_gdpTransportCapable_df] DEFAULT 0,
    [referencesProvided] BIT NOT NULL CONSTRAINT [partner_freight_forwarder_details_referencesProvided_df] DEFAULT 0;

-- AlterTable: partner_client_details — SOP011 Sales pharma/non-pharma
-- qualification fields.
ALTER TABLE [dbo].[partner_client_details] ADD
    [productCategoryLicensingNotes] NVARCHAR(max),
    [destinationCountryRestrictionsNotes] NVARCHAR(max),
    [salesOrderLimit] DECIMAL(18,2),
    [salesOrderLimitCurrency] NVARCHAR(1000),
    [isPharmaApprovedCustomer] BIT NOT NULL CONSTRAINT [partner_client_details_isPharmaApprovedCustomer_df] DEFAULT 0,
    [approvedCustomerLogRef] NVARCHAR(1000),
    [gdpTrainedOfficerAssigned] BIT NOT NULL CONSTRAINT [partner_client_details_gdpTrainedOfficerAssigned_df] DEFAULT 0;

-- CreateTable: partner_warehousing_details — Warehousing didn't have its
-- own detail table before; SOP029 makes clear it's a distinct, governed
-- relationship (Technical Agreement, own WDA, own GDP audit cadence).
CREATE TABLE [dbo].[partner_warehousing_details] (
    [partnerId] NVARCHAR(1000) NOT NULL,
    [wdaNumber] NVARCHAR(1000),
    [technicalAgreementRef] NVARCHAR(1000),
    [gdpAuditDate] DATETIME2,
    [nextGdpAuditDue] DATETIME2,
    [monthlyReconciliationContact] NVARCHAR(1000),
    CONSTRAINT [partner_warehousing_details_pkey] PRIMARY KEY CLUSTERED ([partnerId])
);

-- AddForeignKey
ALTER TABLE [dbo].[partner_warehousing_details] ADD CONSTRAINT [partner_warehousing_details_partnerId_fkey] FOREIGN KEY ([partnerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateTable: partner_manufacturer_sites — one row per registered
-- manufacturing site (the Becton Dickinson folder pattern: a separate ISO
-- 13485 certificate per site).
CREATE TABLE [dbo].[partner_manufacturer_sites] (
    [id] NVARCHAR(1000) NOT NULL,
    [partnerId] NVARCHAR(1000) NOT NULL,
    [siteName] NVARCHAR(1000) NOT NULL,
    [countryCode] NVARCHAR(1000),
    [address] NVARCHAR(max),
    [isPrimary] BIT NOT NULL CONSTRAINT [partner_manufacturer_sites_isPrimary_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [partner_manufacturer_sites_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [partner_manufacturer_sites_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [partner_manufacturer_sites_partnerId_idx] ON [dbo].[partner_manufacturer_sites]([partnerId]);

-- AddForeignKey
ALTER TABLE [dbo].[partner_manufacturer_sites] ADD CONSTRAINT [partner_manufacturer_sites_partnerId_fkey] FOREIGN KEY ([partnerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CreateTable: partner_company_checks — Bioconnections FORM 008.1's
-- "Company Checks" table (Companies House, VAT, Website, Financial Credit
-- Status, Location, Business Insurance) as dated, sourced check records.
CREATE TABLE [dbo].[partner_company_checks] (
    [id] NVARCHAR(1000) NOT NULL,
    [partnerId] NVARCHAR(1000) NOT NULL,
    [checkType] NVARCHAR(1000) NOT NULL,
    [result] NVARCHAR(1000) NOT NULL,
    [checkedDate] DATETIME2,
    [referenceOrSource] NVARCHAR(1000),
    [comment] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [partner_company_checks_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [partner_company_checks_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [partner_company_checks_partnerId_idx] ON [dbo].[partner_company_checks]([partnerId]);

-- AddForeignKey
ALTER TABLE [dbo].[partner_company_checks] ADD CONSTRAINT [partner_company_checks_partnerId_fkey] FOREIGN KEY ([partnerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AlterTable: partner_certifications — reference number, revision,
-- issuing body, site scoping, verification-as-its-own-event, archive
-- status (see schema.prisma's expanded doc comment on
-- PartnerCertification).
ALTER TABLE [dbo].[partner_certifications] ADD
    [manufacturerSiteId] NVARCHAR(1000),
    [referenceNumber] NVARCHAR(1000),
    [revision] NVARCHAR(1000),
    [issuingBody] NVARCHAR(1000),
    [verifiedAt] DATETIME2,
    [verifiedById] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [partner_certifications_status_df] DEFAULT 'CURRENT',
    [notes] NVARCHAR(max);

-- CreateIndex
CREATE NONCLUSTERED INDEX [partner_certifications_manufacturerSiteId_idx] ON [dbo].[partner_certifications]([manufacturerSiteId]);

-- AddForeignKey
ALTER TABLE [dbo].[partner_certifications] ADD CONSTRAINT [partner_certifications_manufacturerSiteId_fkey] FOREIGN KEY ([manufacturerSiteId]) REFERENCES [dbo].[partner_manufacturer_sites]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;
