BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[product_safety_notices] (
    [id] NVARCHAR(1000) NOT NULL,
    [productMasterId] NVARCHAR(1000),
    [productFamilyId] NVARCHAR(1000),
    [noticeType] NVARCHAR(1000) NOT NULL,
    [severity] NVARCHAR(1000) NOT NULL,
    [authority] NVARCHAR(1000) NOT NULL,
    [referenceNumber] NVARCHAR(1000),
    [title] NVARCHAR(1000) NOT NULL,
    [summary] NVARCHAR(max) NOT NULL,
    [actionRequired] NVARCHAR(max),
    [affectedBatches] NVARCHAR(max),
    [countryCodes] NVARCHAR(1000),
    [issueDate] DATETIME2 NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [product_safety_notices_status_df] DEFAULT 'OPEN',
    [closedDate] DATETIME2,
    [closedReason] NVARCHAR(max),
    [sourceUrl] NVARCHAR(1000),
    [verificationLevel] NVARCHAR(1000) NOT NULL CONSTRAINT [product_safety_notices_verificationLevel_df] DEFAULT 'CONTRIBUTED',
    [contributedByOrganizationId] NVARCHAR(1000),
    [contributedByOrganizationName] NVARCHAR(1000),
    [contributedById] NVARCHAR(1000),
    [isSimulated] BIT NOT NULL CONSTRAINT [product_safety_notices_isSimulated_df] DEFAULT 0,
    [isArchived] BIT NOT NULL CONSTRAINT [product_safety_notices_isArchived_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [product_safety_notices_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [product_safety_notices_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[product_safety_notice_reviews] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [noticeId] NVARCHAR(1000) NOT NULL,
    [outcome] NVARCHAR(1000) NOT NULL,
    [notes] NVARCHAR(max),
    [reviewedById] NVARCHAR(1000) NOT NULL,
    [reviewedAt] DATETIME2 NOT NULL CONSTRAINT [product_safety_notice_reviews_reviewedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [product_safety_notice_reviews_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_safety_notices_productMasterId_isArchived_status_idx] ON [dbo].[product_safety_notices]([productMasterId], [isArchived], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_safety_notices_productFamilyId_isArchived_status_idx] ON [dbo].[product_safety_notices]([productFamilyId], [isArchived], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_safety_notices_status_severity_issueDate_idx] ON [dbo].[product_safety_notices]([status], [severity], [issueDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_safety_notice_reviews_organizationId_noticeId_reviewedAt_idx] ON [dbo].[product_safety_notice_reviews]([organizationId], [noticeId], [reviewedAt]);

-- AddForeignKey
ALTER TABLE [dbo].[product_safety_notices] ADD CONSTRAINT [product_safety_notices_productMasterId_fkey] FOREIGN KEY ([productMasterId]) REFERENCES [dbo].[product_master]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_safety_notices] ADD CONSTRAINT [product_safety_notices_productFamilyId_fkey] FOREIGN KEY ([productFamilyId]) REFERENCES [dbo].[product_families]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_safety_notice_reviews] ADD CONSTRAINT [product_safety_notice_reviews_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_safety_notice_reviews] ADD CONSTRAINT [product_safety_notice_reviews_noticeId_fkey] FOREIGN KEY ([noticeId]) REFERENCES [dbo].[product_safety_notices]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_safety_notice_reviews] ADD CONSTRAINT [product_safety_notice_reviews_reviewedById_fkey] FOREIGN KEY ([reviewedById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

