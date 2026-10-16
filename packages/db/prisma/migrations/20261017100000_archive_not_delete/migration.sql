BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[users] ADD [archiveReason] NVARCHAR(1000),
[archivedAt] DATETIME2,
[archivedById] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[roles] ADD [archivedAt] DATETIME2,
[archivedById] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[project_leads] ADD [removedAt] DATETIME2,
[removedById] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[project_contacts] ADD [removedAt] DATETIME2,
[removedById] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[project_lines] ADD [archivedAt] DATETIME2,
[archivedById] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[project_documents] ADD [archivedAt] DATETIME2,
[archivedById] NVARCHAR(1000);

-- AlterTable
ALTER TABLE [dbo].[manufacturer_sites] ADD [archivedAt] DATETIME2,
[archivedById] NVARCHAR(1000);

-- Existing deactivated users are, in the new terminology, archived accounts.
EXEC('UPDATE [dbo].[users] SET [archivedAt] = [updatedAt] WHERE [status] = ''DEACTIVATED'' AND [archivedAt] IS NULL');

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

