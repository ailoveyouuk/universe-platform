BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[crm_contact_profiles] ADD [isPrimary] BIT NOT NULL CONSTRAINT [crm_contact_profiles_isPrimary_df] DEFAULT 0;

CREATE TABLE [dbo].[crm_locations] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [relationshipId] NVARCHAR(1000) NOT NULL,
    [kind] NVARCHAR(1000) NOT NULL CONSTRAINT [crm_locations_kind_df] DEFAULT 'OFFICE',
    [name] NVARCHAR(150) NOT NULL,
    [countryCode] NVARCHAR(1000),
    [city] NVARCHAR(100),
    [address] NVARCHAR(500),
    [phone] NVARCHAR(60),
    [email] NVARCHAR(200),
    [notes] NVARCHAR(500),
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [crm_locations_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [archivedAt] DATETIME2,
    CONSTRAINT [crm_locations_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[crm_links] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [relationshipId] NVARCHAR(1000) NOT NULL,
    [kind] NVARCHAR(1000) NOT NULL,
    [label] NVARCHAR(100) NOT NULL,
    [url] NVARCHAR(500) NOT NULL,
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [crm_links_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [archivedAt] DATETIME2,
    CONSTRAINT [crm_links_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [crm_locations_organizationId_relationshipId_idx] ON [dbo].[crm_locations]([organizationId], [relationshipId]);
CREATE NONCLUSTERED INDEX [crm_links_organizationId_relationshipId_idx] ON [dbo].[crm_links]([organizationId], [relationshipId]);

ALTER TABLE [dbo].[crm_locations] ADD CONSTRAINT [crm_locations_relationshipId_fkey] FOREIGN KEY ([relationshipId]) REFERENCES [dbo].[crm_relationships]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[crm_links] ADD CONSTRAINT [crm_links_relationshipId_fkey] FOREIGN KEY ([relationshipId]) REFERENCES [dbo].[crm_relationships]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
