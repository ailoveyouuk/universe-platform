BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[user_organization_access] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [grantedOrganizationId] NVARCHAR(1000) NOT NULL,
    [grantedBy] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [user_organization_access_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [user_organization_access_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [user_organization_access_userId_grantedOrganizationId_key] UNIQUE NONCLUSTERED ([userId],[grantedOrganizationId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [user_organization_access_grantedOrganizationId_idx] ON [dbo].[user_organization_access]([grantedOrganizationId]);

-- AddForeignKey
ALTER TABLE [dbo].[user_organization_access] ADD CONSTRAINT [user_organization_access_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[user_organization_access] ADD CONSTRAINT [user_organization_access_grantedOrganizationId_fkey] FOREIGN KEY ([grantedOrganizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
