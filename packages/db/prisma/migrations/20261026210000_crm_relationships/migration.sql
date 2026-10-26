BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[crm_relationships] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [partnerId] NVARCHAR(1000),
    [counterpartyOrganizationId] NVARCHAR(1000),
    [counterpartyKey] NVARCHAR(1000) NOT NULL,
    [ownerUserId] NVARCHAR(1000),
    [tier] NVARCHAR(1000) NOT NULL CONSTRAINT [crm_relationships_tier_df] DEFAULT 'STANDARD',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [crm_relationships_status_df] DEFAULT 'ACTIVE',
    [summary] NVARCHAR(2000),
    [reviewIntervalMonths] INT NOT NULL CONSTRAINT [crm_relationships_reviewIntervalMonths_df] DEFAULT 12,
    [lastReviewedAt] DATETIME2,
    [nextReviewDue] DATETIME2,
    [healthOverride] NVARCHAR(1000),
    [healthOverrideReason] NVARCHAR(500),
    [archivedAt] DATETIME2,
    [archivedById] NVARCHAR(1000),
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [crm_relationships_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [crm_relationships_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [crm_relationships_organizationId_counterpartyKey_key] UNIQUE NONCLUSTERED ([organizationId],[counterpartyKey])
);

CREATE NONCLUSTERED INDEX [crm_relationships_organizationId_status_idx] ON [dbo].[crm_relationships]([organizationId], [status]);
CREATE NONCLUSTERED INDEX [crm_relationships_organizationId_ownerUserId_idx] ON [dbo].[crm_relationships]([organizationId], [ownerUserId]);
CREATE NONCLUSTERED INDEX [crm_relationships_partnerId_idx] ON [dbo].[crm_relationships]([partnerId]);

ALTER TABLE [dbo].[crm_relationships] ADD CONSTRAINT [crm_relationships_partnerId_fkey] FOREIGN KEY ([partnerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
