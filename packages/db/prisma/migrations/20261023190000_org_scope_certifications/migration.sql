BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[organization_scope] (
    [archivedAt] DATETIME2,
    [archivedById] NVARCHAR(1000),
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [scopeSubId] NVARCHAR(100) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [organization_scope_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [organization_scope_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [organization_scope_organizationId_scopeSubId_key] UNIQUE NONCLUSTERED ([organizationId],[scopeSubId])
);

CREATE TABLE [dbo].[organization_certifications] (
    [archivedAt] DATETIME2,
    [archivedById] NVARCHAR(1000),
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(60) NOT NULL,
    [title] NVARCHAR(200),
    [reference] NVARCHAR(200),
    [issuingBody] NVARCHAR(200),
    [issuedOn] DATETIME2,
    [expiresOn] DATETIME2,
    [notes] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [organization_certifications_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [organization_certifications_pkey] PRIMARY KEY CLUSTERED ([id])
);
CREATE NONCLUSTERED INDEX [organization_certifications_organizationId_idx] ON [dbo].[organization_certifications]([organizationId]);
CREATE NONCLUSTERED INDEX [organization_certifications_expiresOn_idx] ON [dbo].[organization_certifications]([expiresOn]);

ALTER TABLE [dbo].[organization_scope] ADD CONSTRAINT [organization_scope_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[organization_certifications] ADD CONSTRAINT [organization_certifications_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
