BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[tenders] ADD [allowTemplateSubmission] BIT NOT NULL CONSTRAINT [tenders_allowTemplateSubmission_df] DEFAULT 1;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
