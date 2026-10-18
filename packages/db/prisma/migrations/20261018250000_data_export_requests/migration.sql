BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[data_export_requests] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [requestedById] NVARCHAR(1000) NOT NULL,
    [scope] NVARCHAR(1000) NOT NULL,
    [filters] NVARCHAR(max),
    [reason] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [data_export_requests_status_df] DEFAULT 'PENDING',
    [decidedById] NVARCHAR(1000),
    [decidedAt] DATETIME2,
    [decisionNote] NVARCHAR(max),
    [approvedUntil] DATETIME2,
    [downloadedAt] DATETIME2,
    [rowCount] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [data_export_requests_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [data_export_requests_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [data_export_requests_organizationId_createdAt_idx] ON [dbo].[data_export_requests]([organizationId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [data_export_requests_status_createdAt_idx] ON [dbo].[data_export_requests]([status], [createdAt]);

-- AddForeignKey
ALTER TABLE [dbo].[data_export_requests] ADD CONSTRAINT [data_export_requests_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[data_export_requests] ADD CONSTRAINT [data_export_requests_requestedById_fkey] FOREIGN KEY ([requestedById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[data_export_requests] ADD CONSTRAINT [data_export_requests_decidedById_fkey] FOREIGN KEY ([decidedById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

