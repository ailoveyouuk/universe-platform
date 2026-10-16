BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[organizations] ADD [isDemo] BIT NOT NULL CONSTRAINT [organizations_isDemo_df] DEFAULT 0;

-- The existing Universe Demo organisation is the demo sandbox.
EXEC('UPDATE [dbo].[organizations] SET [isDemo] = 1 WHERE [name] = ''Universe Demo''');

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

