BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[product_regulatory_registrations] (
    [id] NVARCHAR(1000) NOT NULL,
    [productMasterId] NVARCHAR(1000) NOT NULL,
    [authority] NVARCHAR(1000) NOT NULL,
    [scheme] NVARCHAR(1000),
    [referenceNumber] NVARCHAR(1000) NOT NULL,
    [regulatoryClass] NVARCHAR(1000),
    [countryCode] NVARCHAR(1000),
    [holderName] NVARCHAR(1000),
    [issueDate] DATETIME2,
    [expiryDate] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [product_regulatory_registrations_status_df] DEFAULT 'ACTIVE',
    [sourceUrl] NVARCHAR(1000),
    [notes] NVARCHAR(max),
    [verificationLevel] NVARCHAR(1000) NOT NULL CONSTRAINT [product_regulatory_registrations_verificationLevel_df] DEFAULT 'CONTRIBUTED',
    [contributedByOrganizationId] NVARCHAR(1000),
    [contributedByOrganizationName] NVARCHAR(1000),
    [contributedById] NVARCHAR(1000),
    [isSimulated] BIT NOT NULL CONSTRAINT [product_regulatory_registrations_isSimulated_df] DEFAULT 0,
    [isArchived] BIT NOT NULL CONSTRAINT [product_regulatory_registrations_isArchived_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [product_regulatory_registrations_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [product_regulatory_registrations_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[product_registration_verifications] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [registrationId] NVARCHAR(1000) NOT NULL,
    [outcome] NVARCHAR(1000) NOT NULL,
    [jurisdiction] NVARCHAR(1000),
    [notes] NVARCHAR(max),
    [nextReverificationDue] DATETIME2,
    [verifiedById] NVARCHAR(1000) NOT NULL,
    [verifiedAt] DATETIME2 NOT NULL CONSTRAINT [product_registration_verifications_verifiedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [product_registration_verifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_regulatory_registrations_productMasterId_isArchived_idx] ON [dbo].[product_regulatory_registrations]([productMasterId], [isArchived]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_regulatory_registrations_expiryDate_status_idx] ON [dbo].[product_regulatory_registrations]([expiryDate], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_regulatory_registrations_authority_referenceNumber_idx] ON [dbo].[product_regulatory_registrations]([authority], [referenceNumber]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_registration_verifications_organizationId_registrationId_verifiedAt_idx] ON [dbo].[product_registration_verifications]([organizationId], [registrationId], [verifiedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_registration_verifications_organizationId_nextReverificationDue_idx] ON [dbo].[product_registration_verifications]([organizationId], [nextReverificationDue]);

-- AddForeignKey
ALTER TABLE [dbo].[product_regulatory_registrations] ADD CONSTRAINT [product_regulatory_registrations_productMasterId_fkey] FOREIGN KEY ([productMasterId]) REFERENCES [dbo].[product_master]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_registration_verifications] ADD CONSTRAINT [product_registration_verifications_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_registration_verifications] ADD CONSTRAINT [product_registration_verifications_registrationId_fkey] FOREIGN KEY ([registrationId]) REFERENCES [dbo].[product_regulatory_registrations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_registration_verifications] ADD CONSTRAINT [product_registration_verifications_verifiedById_fkey] FOREIGN KEY ([verifiedById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

