BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[stakeholder_registry_entries] ADD [isSimulated] BIT NOT NULL CONSTRAINT [stakeholder_registry_entries_isSimulated_df] DEFAULT 0;

-- Lewis (2026-10-17): everything in the system at this point is simulated demo data; real organisations and
-- users added from now on must never see it. Flag the existing shared data and the pilot test organisations.
-- (Tenant-scoped rows such as users are flagged by the loader script, because row-level security hides them here.)
EXEC('UPDATE [dbo].[stakeholder_registry_entries] SET [isSimulated] = 1');
EXEC('UPDATE [dbo].[product_master] SET [isSimulated] = 1');
EXEC('UPDATE [dbo].[organizations] SET [isSimulated] = 1 WHERE [isDemo] = 0');

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
