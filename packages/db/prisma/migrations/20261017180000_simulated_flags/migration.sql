BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[organizations] ADD [isSimulated] BIT NOT NULL CONSTRAINT [organizations_isSimulated_df] DEFAULT 0;
ALTER TABLE [dbo].[users] ADD [isSimulated] BIT NOT NULL CONSTRAINT [users_isSimulated_df] DEFAULT 0;
ALTER TABLE [dbo].[product_master] ADD [isSimulated] BIT NOT NULL CONSTRAINT [product_master_isSimulated_df] DEFAULT 0;

-- Backfill the generated scale-test data loaded into Universe Demo on 2026-10-17.
EXEC('UPDATE [dbo].[organizations] SET [isSimulated] = 1 WHERE [slug] LIKE ''sim-%''');
EXEC('UPDATE [dbo].[users] SET [isSimulated] = 1 WHERE [email] LIKE ''%@sim.example''');
EXEC('UPDATE [dbo].[product_master] SET [isSimulated] = 1 WHERE [sourceStandard] = ''SIM-SCALE''');

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
