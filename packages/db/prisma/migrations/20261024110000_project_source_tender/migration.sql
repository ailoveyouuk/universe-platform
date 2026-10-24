BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[projects] ADD [sourceTenderId] NVARCHAR(1000) NULL;
CREATE NONCLUSTERED INDEX [projects_organizationId_sourceTenderId_idx] ON [dbo].[projects]([organizationId], [sourceTenderId]);

ALTER TABLE [dbo].[project_lines] ADD [sourceTenderLineId] NVARCHAR(1000) NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
