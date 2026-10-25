BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[tender_lines] ADD [serviceCategory] NVARCHAR(40) NULL;
ALTER TABLE [dbo].[tender_lines] ADD [servicePricingBasis] NVARCHAR(20) NULL;
ALTER TABLE [dbo].[tender_lines] ADD [serviceCode] NVARCHAR(40) NULL;
ALTER TABLE [dbo].[project_lines] ADD [serviceCode] NVARCHAR(40) NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
