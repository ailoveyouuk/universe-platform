BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[product_master] ADD [productFamilyId] NVARCHAR(1000),
[variantLabel] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[product_identifiers] ADD [packagingLevel] NVARCHAR(1000),
[unitsPerPack] INT;

-- AlterTable
ALTER TABLE [dbo].[product_regulatory_registrations] ALTER COLUMN [productMasterId] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[product_regulatory_registrations] ADD [productFamilyId] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[product_documents] ALTER COLUMN [productMasterId] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[product_documents] ADD [productFamilyId] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[product_families] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [brand] NVARCHAR(1000),
    [inn] NVARCHAR(1000),
    [regulatoryClass] NVARCHAR(1000),
    [intendedUse] NVARCHAR(max),
    [description] NVARCHAR(max),
    [isSimulated] BIT NOT NULL CONSTRAINT [product_families_isSimulated_df] DEFAULT 0,
    [isArchived] BIT NOT NULL CONSTRAINT [product_families_isArchived_df] DEFAULT 0,
    [addedByOrganizationId] NVARCHAR(1000),
    [addedByOrganizationName] NVARCHAR(1000),
    [version] INT NOT NULL CONSTRAINT [product_families_version_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [product_families_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [product_families_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[product_family_changes] (
    [id] NVARCHAR(1000) NOT NULL,
    [productFamilyId] NVARCHAR(1000) NOT NULL,
    [fieldName] NVARCHAR(1000) NOT NULL,
    [oldValue] NVARCHAR(max),
    [newValue] NVARCHAR(max),
    [source] NVARCHAR(1000) NOT NULL,
    [changedById] NVARCHAR(1000),
    [changedByName] NVARCHAR(1000),
    [changedByOrganizationId] NVARCHAR(1000),
    [changedByOrganizationName] NVARCHAR(1000),
    [changedAt] DATETIME2 NOT NULL CONSTRAINT [product_family_changes_changedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [product_family_changes_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_families_category_idx] ON [dbo].[product_families]([category]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_families_name_idx] ON [dbo].[product_families]([name]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_families_isSimulated_isArchived_idx] ON [dbo].[product_families]([isSimulated], [isArchived]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_family_changes_productFamilyId_changedAt_idx] ON [dbo].[product_family_changes]([productFamilyId], [changedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_master_productFamilyId_idx] ON [dbo].[product_master]([productFamilyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_regulatory_registrations_productFamilyId_isArchived_idx] ON [dbo].[product_regulatory_registrations]([productFamilyId], [isArchived]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_documents_organizationId_productFamilyId_archivedAt_idx] ON [dbo].[product_documents]([organizationId], [productFamilyId], [archivedAt]);

-- AddForeignKey
ALTER TABLE [dbo].[product_master] ADD CONSTRAINT [product_master_productFamilyId_fkey] FOREIGN KEY ([productFamilyId]) REFERENCES [dbo].[product_families]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_regulatory_registrations] ADD CONSTRAINT [product_regulatory_registrations_productFamilyId_fkey] FOREIGN KEY ([productFamilyId]) REFERENCES [dbo].[product_families]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_family_changes] ADD CONSTRAINT [product_family_changes_productFamilyId_fkey] FOREIGN KEY ([productFamilyId]) REFERENCES [dbo].[product_families]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_documents] ADD CONSTRAINT [product_documents_productFamilyId_fkey] FOREIGN KEY ([productFamilyId]) REFERENCES [dbo].[product_families]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

