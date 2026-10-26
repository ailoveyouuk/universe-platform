BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[tender_mini_competitions] ADD [schemeJson] NVARCHAR(max) NULL;
ALTER TABLE [dbo].[tender_call_off_quotes] ADD [responsesJson] NVARCHAR(max) NULL;
ALTER TABLE [dbo].[tender_call_off_quotes] ADD [scoresJson] NVARCHAR(max) NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
