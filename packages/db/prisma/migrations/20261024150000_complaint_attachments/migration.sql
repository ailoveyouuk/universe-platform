BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[quality_complaint_documents] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [complaintId] NVARCHAR(1000) NOT NULL,
    [documentId] NVARCHAR(1000) NOT NULL,
    [note] NVARCHAR(500),
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [quality_complaint_documents_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [archivedAt] DATETIME2,
    [archivedById] NVARCHAR(1000),
    CONSTRAINT [quality_complaint_documents_pkey] PRIMARY KEY CLUSTERED ([id])
);
CREATE NONCLUSTERED INDEX [quality_complaint_documents_complaintId_idx] ON [dbo].[quality_complaint_documents]([complaintId]);
CREATE NONCLUSTERED INDEX [quality_complaint_documents_organizationId_idx] ON [dbo].[quality_complaint_documents]([organizationId]);
CREATE NONCLUSTERED INDEX [quality_complaint_documents_documentId_idx] ON [dbo].[quality_complaint_documents]([documentId]);
ALTER TABLE [dbo].[quality_complaint_documents] ADD CONSTRAINT [quality_complaint_documents_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[quality_complaint_documents] ADD CONSTRAINT [quality_complaint_documents_complaintId_fkey] FOREIGN KEY ([complaintId]) REFERENCES [dbo].[quality_complaints]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[quality_complaint_documents] ADD CONSTRAINT [quality_complaint_documents_documentId_fkey] FOREIGN KEY ([documentId]) REFERENCES [dbo].[project_documents]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
