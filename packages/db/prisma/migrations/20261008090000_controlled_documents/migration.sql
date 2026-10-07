BEGIN TRAN;

-- Gap 7 (compliance-standards-gap-analysis.md) — a minimal controlled-
-- document register for an organisation's own SOPs/policies. See
-- ControlledDocument's doc comment in schema.prisma. One new table, no
-- changes to any existing one.
--
-- GO is not valid T-SQL and `prisma migrate deploy` does not batch-split
-- on it (same note as every migration this project has written since
-- 20261003090000) — this file is one continuous batch.

CREATE TABLE [dbo].[controlled_documents] (
  [id] NVARCHAR(1000) NOT NULL,
  [organizationId] NVARCHAR(1000) NOT NULL,
  [title] NVARCHAR(1000) NOT NULL,
  [category] NVARCHAR(1000) NOT NULL,
  [version] NVARCHAR(1000) NOT NULL,
  [effectiveDate] DATETIME2,
  [supersedesId] NVARCHAR(1000),
  [approvedById] NVARCHAR(1000),
  [approvedAt] DATETIME2,
  [documentId] NVARCHAR(1000),
  [createdById] NVARCHAR(1000),
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [controlled_documents_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [controlled_documents_pkey] PRIMARY KEY ([id]),
  CONSTRAINT [controlled_documents_supersedesId_key] UNIQUE ([supersedesId])
);

ALTER TABLE [dbo].[controlled_documents] ADD CONSTRAINT [controlled_documents_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[controlled_documents] ADD CONSTRAINT [controlled_documents_supersedesId_fkey] FOREIGN KEY ([supersedesId]) REFERENCES [dbo].[controlled_documents]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[controlled_documents] ADD CONSTRAINT [controlled_documents_approvedById_fkey] FOREIGN KEY ([approvedById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[controlled_documents] ADD CONSTRAINT [controlled_documents_documentId_fkey] FOREIGN KEY ([documentId]) REFERENCES [dbo].[project_documents]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX [controlled_documents_organizationId_idx] ON [dbo].[controlled_documents]([organizationId]);
CREATE INDEX [controlled_documents_organizationId_category_idx] ON [dbo].[controlled_documents]([organizationId], [category]);

COMMIT TRAN;
