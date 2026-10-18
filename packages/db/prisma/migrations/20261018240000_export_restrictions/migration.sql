BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[export_restrictions] (
    [id] NVARCHAR(1000) NOT NULL,
    [restrictingCountryCode] NVARCHAR(1000) NOT NULL,
    [source] NVARCHAR(1000) NOT NULL,
    [sourceKey] NVARCHAR(1000) NOT NULL,
    [medicineName] NVARCHAR(1000) NOT NULL,
    [strength] NVARCHAR(1000),
    [form] NVARCHAR(1000),
    [scope] NVARCHAR(1000) NOT NULL CONSTRAINT [export_restrictions_scope_df] DEFAULT 'BOTH',
    [restrictionDate] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [export_restrictions_status_df] DEFAULT 'ACTIVE',
    [removedAt] DATETIME2,
    [sourceUrl] NVARCHAR(1000),
    [notes] NVARCHAR(max),
    [addedByName] NVARCHAR(1000),
    [isSimulated] BIT NOT NULL CONSTRAINT [export_restrictions_isSimulated_df] DEFAULT 0,
    [firstSeenAt] DATETIME2 NOT NULL CONSTRAINT [export_restrictions_firstSeenAt_df] DEFAULT CURRENT_TIMESTAMP,
    [lastSeenAt] DATETIME2 NOT NULL CONSTRAINT [export_restrictions_lastSeenAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [export_restrictions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [export_restrictions_source_restrictingCountryCode_sourceKey_key] UNIQUE NONCLUSTERED ([source],[restrictingCountryCode],[sourceKey])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [export_restrictions_restrictingCountryCode_status_idx] ON [dbo].[export_restrictions]([restrictingCountryCode], [status]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

