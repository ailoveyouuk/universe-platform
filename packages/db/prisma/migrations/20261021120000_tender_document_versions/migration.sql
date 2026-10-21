BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[tender_documents] ADD [description] NVARCHAR(1000),
[documentKey] NVARCHAR(1000),
[supersededAt] DATETIME2,
[version] INT NOT NULL CONSTRAINT [tender_documents_version_df] DEFAULT 1;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
