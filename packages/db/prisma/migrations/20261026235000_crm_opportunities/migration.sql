BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[crm_opportunities] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [relationshipId] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(200) NOT NULL,
    [kind] NVARCHAR(1000) NOT NULL,
    [stage] NVARCHAR(1000) NOT NULL CONSTRAINT [crm_opportunities_stage_df] DEFAULT 'IDENTIFIED',
    [stageChangedAt] DATETIME2 NOT NULL CONSTRAINT [crm_opportunities_stageChangedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [expectedValue] DECIMAL(18,2),
    [currency] CHAR(3),
    [expectedDate] DATETIME2,
    [ownerUserId] NVARCHAR(1000),
    [notes] NVARCHAR(1000),
    [lostReason] NVARCHAR(500),
    [linkedType] NVARCHAR(1000),
    [linkedId] NVARCHAR(1000),
    [linkedLabel] NVARCHAR(300),
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [crm_opportunities_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [archivedAt] DATETIME2,
    [archivedById] NVARCHAR(1000),
    CONSTRAINT [crm_opportunities_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [crm_opportunities_organizationId_stage_idx] ON [dbo].[crm_opportunities]([organizationId], [stage]);
CREATE NONCLUSTERED INDEX [crm_opportunities_organizationId_relationshipId_idx] ON [dbo].[crm_opportunities]([organizationId], [relationshipId]);

ALTER TABLE [dbo].[crm_opportunities] ADD CONSTRAINT [crm_opportunities_relationshipId_fkey] FOREIGN KEY ([relationshipId]) REFERENCES [dbo].[crm_relationships]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
