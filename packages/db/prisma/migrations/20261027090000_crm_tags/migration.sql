BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[crm_tags] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(60) NOT NULL,
    [normalizedName] NVARCHAR(60) NOT NULL,
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [crm_tags_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [archivedAt] DATETIME2,
    CONSTRAINT [crm_tags_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [crm_tags_organizationId_normalizedName_key] UNIQUE NONCLUSTERED ([organizationId], [normalizedName])
);

CREATE TABLE [dbo].[crm_relationship_tags] (
    [relationshipId] NVARCHAR(1000) NOT NULL,
    [tagId] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [addedById] NVARCHAR(1000),
    [addedAt] DATETIME2 NOT NULL CONSTRAINT [crm_relationship_tags_addedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [removedAt] DATETIME2,
    CONSTRAINT [crm_relationship_tags_pkey] PRIMARY KEY CLUSTERED ([relationshipId], [tagId])
);

CREATE NONCLUSTERED INDEX [crm_relationship_tags_organizationId_tagId_idx] ON [dbo].[crm_relationship_tags]([organizationId], [tagId]);

ALTER TABLE [dbo].[crm_relationship_tags] ADD CONSTRAINT [crm_relationship_tags_relationshipId_fkey] FOREIGN KEY ([relationshipId]) REFERENCES [dbo].[crm_relationships]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[crm_relationship_tags] ADD CONSTRAINT [crm_relationship_tags_tagId_fkey] FOREIGN KEY ([tagId]) REFERENCES [dbo].[crm_tags]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
