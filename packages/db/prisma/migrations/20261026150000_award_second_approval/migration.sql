BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[tenders] ADD [pendingAwardJson] NVARCHAR(max) NULL;
ALTER TABLE [dbo].[tenders] ADD [pendingAwardValue] DECIMAL(18,2) NULL;
ALTER TABLE [dbo].[tenders] ADD [pendingAwardSummary] NVARCHAR(500) NULL;
ALTER TABLE [dbo].[tenders] ADD [pendingAwardById] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[tenders] ADD [pendingAwardAt] DATETIME2 NULL;
ALTER TABLE [dbo].[tender_awards] ADD [approvedById] NVARCHAR(1000) NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
