BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[crm_saved_filters] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [ownerUserId] NVARCHAR(1000) NOT NULL,
    [view] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(80) NOT NULL,
    [filters] NVARCHAR(1000) NOT NULL,
    [shared] BIT NOT NULL CONSTRAINT [crm_saved_filters_shared_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [crm_saved_filters_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [archivedAt] DATETIME2,
    CONSTRAINT [crm_saved_filters_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [crm_saved_filters_organizationId_view_idx] ON [dbo].[crm_saved_filters]([organizationId], [view]);
CREATE NONCLUSTERED INDEX [crm_saved_filters_organizationId_ownerUserId_idx] ON [dbo].[crm_saved_filters]([organizationId], [ownerUserId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
