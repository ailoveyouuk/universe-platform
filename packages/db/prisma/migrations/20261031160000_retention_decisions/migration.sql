BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[quality_complaints] ADD [complainantAnonymisedAt] DATETIME2;

CREATE TABLE [dbo].[retention_decisions] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [ruleKey] NVARCHAR(60) NOT NULL,
    [recordType] NVARCHAR(20) NOT NULL,
    [recordId] NVARCHAR(1000) NOT NULL,
    [decision] NVARCHAR(12) NOT NULL,
    [reason] NVARCHAR(1000),
    [keptUntil] DATETIME2,
    [decidedById] NVARCHAR(1000),
    [decidedAt] DATETIME2 NOT NULL CONSTRAINT [retention_decisions_decidedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [retention_decisions_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [retention_decisions_organizationId_ruleKey_recordId_idx] ON [dbo].[retention_decisions]([organizationId], [ruleKey], [recordId]);

CREATE TABLE [dbo].[retention_overrides] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [ruleKey] NVARCHAR(60) NOT NULL,
    [months] INT NOT NULL,
    [reason] NVARCHAR(1000) NOT NULL,
    [setById] NVARCHAR(1000),
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [retention_overrides_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [retention_overrides_organizationId_ruleKey_key] UNIQUE NONCLUSTERED ([organizationId],[ruleKey])
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
