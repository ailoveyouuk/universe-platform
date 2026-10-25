BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[insights_user_items] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [kind] NVARCHAR(10) NOT NULL,
    [name] NVARCHAR(120) NOT NULL,
    [target] NVARCHAR(120) NOT NULL,
    [stateJson] NVARCHAR(4000),
    [position] INT NOT NULL CONSTRAINT [insights_user_items_position_df] DEFAULT 0,
    [archivedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [insights_user_items_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [insights_user_items_pkey] PRIMARY KEY CLUSTERED ([id])
);
CREATE NONCLUSTERED INDEX [insights_user_items_organizationId_userId_kind_idx] ON [dbo].[insights_user_items]([organizationId], [userId], [kind]);
ALTER TABLE [dbo].[insights_user_items] ADD CONSTRAINT [insights_user_items_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
