BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[crm_opportunities] ADD [sourceTenderId] NVARCHAR(1000),
[sourceTenderLabel] NVARCHAR(300),
[syncWithLinked] BIT NOT NULL CONSTRAINT [crm_opportunities_syncWithLinked_df] DEFAULT 0;

CREATE TABLE [dbo].[crm_opportunity_participants] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [opportunityId] NVARCHAR(1000) NOT NULL,
    [relationshipId] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(20) NOT NULL,
    [source] NVARCHAR(10) NOT NULL,
    [note] NVARCHAR(300),
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [crm_opportunity_participants_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [archivedAt] DATETIME2,
    CONSTRAINT [crm_opportunity_participants_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [crm_opportunity_participants_opportunityId_relationshipId_role_key] UNIQUE NONCLUSTERED ([opportunityId],[relationshipId],[role])
);

CREATE NONCLUSTERED INDEX [crm_opportunity_participants_organizationId_relationshipId_idx] ON [dbo].[crm_opportunity_participants]([organizationId], [relationshipId]);

ALTER TABLE [dbo].[crm_opportunity_participants] ADD CONSTRAINT [crm_opportunity_participants_opportunityId_fkey] FOREIGN KEY ([opportunityId]) REFERENCES [dbo].[crm_opportunities]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
