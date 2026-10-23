BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[organization_certifications] ADD [documentBlobName] NVARCHAR(500) NULL, [documentFileName] NVARCHAR(300) NULL, [documentSizeBytes] INT NULL, [documentMimeType] NVARCHAR(120) NULL, [documentUploadedAt] DATETIME2 NULL;

CREATE TABLE [dbo].[network_saved_searches] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(120) NOT NULL,
    [criteriaJson] NVARCHAR(max) NOT NULL,
    [alertsEnabled] BIT NOT NULL CONSTRAINT [network_saved_searches_alertsEnabled_df] DEFAULT 1,
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [network_saved_searches_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [network_saved_searches_pkey] PRIMARY KEY CLUSTERED ([id])
);
CREATE NONCLUSTERED INDEX [network_saved_searches_organizationId_idx] ON [dbo].[network_saved_searches]([organizationId]);
ALTER TABLE [dbo].[network_saved_searches] ADD CONSTRAINT [network_saved_searches_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
