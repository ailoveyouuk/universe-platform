BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[organizations] ADD [shareIdentityWithUniverse] BIT NOT NULL CONSTRAINT [organizations_shareIdentityWithUniverse_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[product_master] ADD [attributionOverride] BIT;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

