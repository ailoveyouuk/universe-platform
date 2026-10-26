BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[crm_interactions] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [relationshipId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [occurredAt] DATETIME2 NOT NULL,
    [title] NVARCHAR(200) NOT NULL,
    [summary] NVARCHAR(4000),
    [outcome] NVARCHAR(1000),
    [participantUserIds] NVARCHAR(2000),
    [contactIds] NVARCHAR(2000),
    [linkedType] NVARCHAR(1000),
    [linkedId] NVARCHAR(1000),
    [linkedLabel] NVARCHAR(300),
    [confidential] BIT NOT NULL CONSTRAINT [crm_interactions_confidential_df] DEFAULT 0,
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [crm_interactions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [archivedAt] DATETIME2,
    [archivedById] NVARCHAR(1000),
    CONSTRAINT [crm_interactions_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [crm_interactions_organizationId_relationshipId_occurredAt_idx] ON [dbo].[crm_interactions]([organizationId], [relationshipId], [occurredAt]);
CREATE NONCLUSTERED INDEX [crm_interactions_organizationId_occurredAt_idx] ON [dbo].[crm_interactions]([organizationId], [occurredAt]);

ALTER TABLE [dbo].[crm_interactions] ADD CONSTRAINT [crm_interactions_relationshipId_fkey] FOREIGN KEY ([relationshipId]) REFERENCES [dbo].[crm_relationships]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
