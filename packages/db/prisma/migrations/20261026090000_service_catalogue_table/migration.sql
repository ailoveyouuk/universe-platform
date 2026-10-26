BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[service_catalogue] (
    [code] NVARCHAR(40) NOT NULL,
    [category] NVARCHAR(40) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [basis] NVARCHAR(20) NOT NULL,
    [unit] NVARCHAR(80) NOT NULL,
    [description] NVARCHAR(1000) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [service_catalogue_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [service_catalogue_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [updatedById] NVARCHAR(64) NULL,
    CONSTRAINT [service_catalogue_pkey] PRIMARY KEY CLUSTERED ([code])
);

CREATE NONCLUSTERED INDEX [service_catalogue_category_idx] ON [dbo].[service_catalogue]([category]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
