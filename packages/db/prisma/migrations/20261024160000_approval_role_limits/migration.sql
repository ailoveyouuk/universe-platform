BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[tender_approval_settings] ADD [limitCurrency] CHAR(3) NULL;

CREATE TABLE [dbo].[tender_approval_role_limits] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [roleId] NVARCHAR(1000) NOT NULL,
    [limit] DECIMAL(18,2) NOT NULL,
    [updatedById] NVARCHAR(1000),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [tender_approval_role_limits_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_approval_role_limits_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_approval_role_limits_organizationId_roleId_key] UNIQUE NONCLUSTERED ([organizationId],[roleId])
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
