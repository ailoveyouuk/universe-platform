BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[product_documents] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [productMasterId] NVARCHAR(1000) NOT NULL,
    [registrationId] NVARCHAR(1000),
    [docType] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [version] NVARCHAR(1000) NOT NULL CONSTRAINT [product_documents_version_df] DEFAULT '1.0',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [product_documents_status_df] DEFAULT 'DRAFT',
    [effectiveDate] DATETIME2,
    [expiryDate] DATETIME2,
    [reviewDueDate] DATETIME2,
    [supersedesId] NVARCHAR(1000),
    [blobName] NVARCHAR(1000),
    [fileName] NVARCHAR(1000),
    [fileSizeBytes] INT,
    [mimeType] NVARCHAR(1000),
    [blobEtag] NVARCHAR(1000),
    [scanStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [product_documents_scanStatus_df] DEFAULT 'NOT_SCANNED',
    [notes] NVARCHAR(max),
    [uploadedById] NVARCHAR(1000) NOT NULL,
    [approvedById] NVARCHAR(1000),
    [approvedAt] DATETIME2,
    [isSimulated] BIT NOT NULL CONSTRAINT [product_documents_isSimulated_df] DEFAULT 0,
    [archivedAt] DATETIME2,
    [archivedById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [product_documents_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [product_documents_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_documents_organizationId_productMasterId_archivedAt_idx] ON [dbo].[product_documents]([organizationId], [productMasterId], [archivedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_documents_organizationId_expiryDate_idx] ON [dbo].[product_documents]([organizationId], [expiryDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_documents_productMasterId_idx] ON [dbo].[product_documents]([productMasterId]);

-- AddForeignKey
ALTER TABLE [dbo].[product_documents] ADD CONSTRAINT [product_documents_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_documents] ADD CONSTRAINT [product_documents_productMasterId_fkey] FOREIGN KEY ([productMasterId]) REFERENCES [dbo].[product_master]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_documents] ADD CONSTRAINT [product_documents_uploadedById_fkey] FOREIGN KEY ([uploadedById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_documents] ADD CONSTRAINT [product_documents_approvedById_fkey] FOREIGN KEY ([approvedById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

