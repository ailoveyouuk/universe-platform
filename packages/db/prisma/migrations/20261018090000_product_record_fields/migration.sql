BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[product_master] ADD [brand] NVARCHAR(1000),
[coldChain] BIT NOT NULL CONSTRAINT [product_master_coldChain_df] DEFAULT 0,
[controlledSubstance] BIT NOT NULL CONSTRAINT [product_master_controlledSubstance_df] DEFAULT 0,
[dosageForm] NVARCHAR(1000),
[hazardClass] NVARCHAR(1000),
[inn] NVARCHAR(1000),
[intendedUse] NVARCHAR(max),
[lifecycleChangedAt] DATETIME2,
[lifecycleReason] NVARCHAR(max),
[lifecycleStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [product_master_lifecycleStatus_df] DEFAULT 'ACTIVE',
[nextReviewDue] DATETIME2,
[packSize] NVARCHAR(1000),
[regulatoryClass] NVARCHAR(1000),
[shelfLifeMonths] INT,
[storageClass] NVARCHAR(1000),
[strength] NVARCHAR(1000),
[version] INT NOT NULL CONSTRAINT [product_master_version_df] DEFAULT 1;

-- CreateTable
CREATE TABLE [dbo].[product_identifiers] (
    [id] NVARCHAR(1000) NOT NULL,
    [productMasterId] NVARCHAR(1000) NOT NULL,
    [identifierType] NVARCHAR(1000) NOT NULL,
    [value] NVARCHAR(1000) NOT NULL,
    [label] NVARCHAR(1000),
    [isActive] BIT NOT NULL CONSTRAINT [product_identifiers_isActive_df] DEFAULT 1,
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [product_identifiers_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [product_identifiers_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [product_identifiers_productMasterId_identifierType_value_key] UNIQUE NONCLUSTERED ([productMasterId],[identifierType],[value])
);

-- CreateTable
CREATE TABLE [dbo].[product_master_changes] (
    [id] NVARCHAR(1000) NOT NULL,
    [productMasterId] NVARCHAR(1000) NOT NULL,
    [version] INT NOT NULL,
    [fieldName] NVARCHAR(1000) NOT NULL,
    [oldValue] NVARCHAR(max),
    [newValue] NVARCHAR(max),
    [source] NVARCHAR(1000) NOT NULL,
    [reason] NVARCHAR(max),
    [amendmentId] NVARCHAR(1000),
    [changedById] NVARCHAR(1000),
    [changedByName] NVARCHAR(1000),
    [changedByOrganizationId] NVARCHAR(1000),
    [changedByOrganizationName] NVARCHAR(1000),
    [changedAt] DATETIME2 NOT NULL CONSTRAINT [product_master_changes_changedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [product_master_changes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_identifiers_identifierType_value_idx] ON [dbo].[product_identifiers]([identifierType], [value]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_master_changes_productMasterId_changedAt_idx] ON [dbo].[product_master_changes]([productMasterId], [changedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_master_lifecycleStatus_idx] ON [dbo].[product_master]([lifecycleStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_master_nextReviewDue_idx] ON [dbo].[product_master]([nextReviewDue]);

-- AddForeignKey
ALTER TABLE [dbo].[product_identifiers] ADD CONSTRAINT [product_identifiers_productMasterId_fkey] FOREIGN KEY ([productMasterId]) REFERENCES [dbo].[product_master]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_master_changes] ADD CONSTRAINT [product_master_changes_productMasterId_fkey] FOREIGN KEY ([productMasterId]) REFERENCES [dbo].[product_master]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

