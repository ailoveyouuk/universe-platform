BEGIN TRAN;

-- AlterTable: universal onboarding fields on organizations
ALTER TABLE [dbo].[organizations] ADD
    [legalName] NVARCHAR(1000),
    [legalEntityType] NVARCHAR(1000),
    [countryOfRegistrationCode] NVARCHAR(1000),
    [registrationNumber] NVARCHAR(1000),
    [website] NVARCHAR(1000),
    [primaryContactName] NVARCHAR(1000),
    [primaryContactTitle] NVARCHAR(1000),
    [primaryContactEmail] NVARCHAR(1000),
    [primaryContactPhone] NVARCHAR(1000),
    [onboardingSource] NVARCHAR(1000),
    [notes] NVARCHAR(max);

-- AlterTable: Supplier/Distributor onboarding fields on supplier_profiles
ALTER TABLE [dbo].[supplier_profiles] ADD
    [principalManufacturersRepresented] NVARCHAR(max),
    [wholesaleDistributionLicense] NVARCHAR(1000),
    [warehousingCapability] NVARCHAR(1000),
    [yearsInOperation] INT;

-- CreateTable
CREATE TABLE [dbo].[organization_country_presence] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [countryCode] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [organization_country_presence_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [organization_country_presence_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [organization_country_presence_organizationId_countryCode_key] UNIQUE NONCLUSTERED ([organizationId],[countryCode])
);

-- CreateTable
CREATE TABLE [dbo].[procurement_agent_profiles] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [fundersProgramsOperatedUnder] NVARCHAR(max),
    [productCategoriesProcured] NVARCHAR(max),
    [clientTypesServed] NVARCHAR(max),
    [accreditations] NVARCHAR(max),
    [logisticsCapability] NVARCHAR(1000),
    [yearsOperatingInRole] INT,
    [insuranceCoverSummary] NVARCHAR(max),
    [insuranceExpiryDate] DATETIME2,
    [trackRecordSummary] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [procurement_agent_profiles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [procurement_agent_profiles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [procurement_agent_profiles_organizationId_key] UNIQUE NONCLUSTERED ([organizationId])
);

-- CreateTable
CREATE TABLE [dbo].[tendering_body_profiles] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [bodyType] NVARCHAR(1000),
    [fundingSources] NVARCHAR(max),
    [hasDirectProcurementAuthority] BIT,
    [usesExternalProcurementAgent] BIT NOT NULL CONSTRAINT [tendering_body_profiles_usesExternalProcurementAgent_df] DEFAULT 0,
    [procurementAgentOrganizationId] NVARCHAR(1000),
    [diseaseProgramAreas] NVARCHAR(max),
    [scaleServedSummary] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tendering_body_profiles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [tendering_body_profiles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tendering_body_profiles_organizationId_key] UNIQUE NONCLUSTERED ([organizationId])
);

-- CreateTable
CREATE TABLE [dbo].[manufacturer_profiles] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [productCategoriesManufactured] NVARCHAR(max),
    [whoPrequalified] BIT NOT NULL CONSTRAINT [manufacturer_profiles_whoPrequalified_df] DEFAULT 0,
    [sraApprovals] NVARCHAR(max),
    [nationalRegistrations] NVARCHAR(max),
    [otherCertifications] NVARCHAR(max),
    [productionCapacitySummary] NVARCHAR(max),
    [currentExportMarkets] NVARCHAR(max),
    [isLocalManufacturer] BIT NOT NULL CONSTRAINT [manufacturer_profiles_isLocalManufacturer_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [manufacturer_profiles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [manufacturer_profiles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [manufacturer_profiles_organizationId_key] UNIQUE NONCLUSTERED ([organizationId])
);

-- CreateTable
CREATE TABLE [dbo].[manufacturer_sites] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [locationCountryCode] NVARCHAR(1000),
    [locationDetail] NVARCHAR(1000),
    [gmpCertified] BIT NOT NULL CONSTRAINT [manufacturer_sites_gmpCertified_df] DEFAULT 0,
    [gmpCertificationDetail] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [manufacturer_sites_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [manufacturer_sites_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[funder_profiles] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [fundingFocusAreas] NVARCHAR(max),
    [notes] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [funder_profiles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [funder_profiles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [funder_profiles_organizationId_key] UNIQUE NONCLUSTERED ([organizationId])
);

-- CreateTable
CREATE TABLE [dbo].[data_insights_user_profiles] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [institutionType] NVARCHAR(1000),
    [affiliatedInstitution] NVARCHAR(1000),
    [purposeIntendedUse] NVARCHAR(max),
    [publicationIntent] NVARCHAR(max),
    [fundingSourceOfResearch] NVARCHAR(1000),
    [dataUseAgreementVersion] NVARCHAR(1000),
    [dataUseAgreementAcceptedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [data_insights_user_profiles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [data_insights_user_profiles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [data_insights_user_profiles_organizationId_key] UNIQUE NONCLUSTERED ([organizationId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [manufacturer_sites_organizationId_idx] ON [dbo].[manufacturer_sites]([organizationId]);

-- AddForeignKey
ALTER TABLE [dbo].[organizations] ADD CONSTRAINT [organizations_countryOfRegistrationCode_fkey] FOREIGN KEY ([countryOfRegistrationCode]) REFERENCES [dbo].[countries]([code]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[organization_country_presence] ADD CONSTRAINT [organization_country_presence_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[organization_country_presence] ADD CONSTRAINT [organization_country_presence_countryCode_fkey] FOREIGN KEY ([countryCode]) REFERENCES [dbo].[countries]([code]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[procurement_agent_profiles] ADD CONSTRAINT [procurement_agent_profiles_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tendering_body_profiles] ADD CONSTRAINT [tendering_body_profiles_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tendering_body_profiles] ADD CONSTRAINT [tendering_body_profiles_procurementAgentOrganizationId_fkey] FOREIGN KEY ([procurementAgentOrganizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[manufacturer_profiles] ADD CONSTRAINT [manufacturer_profiles_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[manufacturer_sites] ADD CONSTRAINT [manufacturer_sites_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[manufacturer_sites] ADD CONSTRAINT [manufacturer_sites_locationCountryCode_fkey] FOREIGN KEY ([locationCountryCode]) REFERENCES [dbo].[countries]([code]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[funder_profiles] ADD CONSTRAINT [funder_profiles_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[data_insights_user_profiles] ADD CONSTRAINT [data_insights_user_profiles_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;
