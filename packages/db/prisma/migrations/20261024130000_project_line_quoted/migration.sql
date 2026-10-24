BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[project_lines] ADD [quotedManufacturerName] NVARCHAR(300) NULL;
ALTER TABLE [dbo].[project_lines] ADD [quotedLeadTimeDays] INT NULL;

ALTER TABLE [dbo].[projects] ADD [sourceCallOffId] NVARCHAR(1000) NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
