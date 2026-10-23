BEGIN TRY

BEGIN TRAN;

-- Vaccines list many active substances; the 1000 character limit was too small.
ALTER TABLE [dbo].[pharma_references] ALTER COLUMN [activeSubstances] NVARCHAR(max) NULL;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
