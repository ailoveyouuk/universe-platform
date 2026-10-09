BEGIN TRAN;

-- Stage 0 point 1 (product-database-and-map-roadmap.md) — catalogue
-- edit-rights + ratification workflow. ProductMaster stays globally
-- shared/writable at the schema level (no change to that table); this
-- new table is the gate application code puts in front of it. See
-- ProductAmendment's doc comment in schema.prisma for the full design.
--
-- GO is not valid T-SQL and `prisma migrate deploy` does not batch-split
-- on it (same note as every migration this project has written since
-- 20261003090000) — this file is one continuous batch.

CREATE TABLE [dbo].[product_amendments] (
  [id] NVARCHAR(1000) NOT NULL,
  [organizationId] NVARCHAR(1000) NOT NULL,
  [productMasterId] NVARCHAR(1000) NOT NULL,
  [proposedChanges] NVARCHAR(MAX) NOT NULL,
  [status] NVARCHAR(1000) NOT NULL CONSTRAINT [product_amendments_status_df] DEFAULT 'PENDING',
  [submittedById] NVARCHAR(1000) NOT NULL,
  [submittedAt] DATETIME2 NOT NULL CONSTRAINT [product_amendments_submittedAt_df] DEFAULT CURRENT_TIMESTAMP,
  [reviewedById] NVARCHAR(1000),
  [reviewedAt] DATETIME2,
  [reviewNotes] NVARCHAR(MAX),
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [product_amendments_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [product_amendments_pkey] PRIMARY KEY ([id])
);

ALTER TABLE [dbo].[product_amendments] ADD CONSTRAINT [product_amendments_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[product_amendments] ADD CONSTRAINT [product_amendments_productMasterId_fkey] FOREIGN KEY ([productMasterId]) REFERENCES [dbo].[product_master]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[product_amendments] ADD CONSTRAINT [product_amendments_submittedById_fkey] FOREIGN KEY ([submittedById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[product_amendments] ADD CONSTRAINT [product_amendments_reviewedById_fkey] FOREIGN KEY ([reviewedById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX [product_amendments_organizationId_idx] ON [dbo].[product_amendments]([organizationId]);
CREATE INDEX [product_amendments_productMasterId_idx] ON [dbo].[product_amendments]([productMasterId]);
CREATE INDEX [product_amendments_status_idx] ON [dbo].[product_amendments]([status]);

COMMIT TRAN;
