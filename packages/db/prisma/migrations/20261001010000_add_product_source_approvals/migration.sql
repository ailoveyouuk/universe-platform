BEGIN TRAN;

-- CreateTable: product_source_approvals — Quality Assurance section
-- (round 3 feedback, 2026-10-01). A standing, organization-owned approved
-- sourcing relationship (ProductMaster + manufacturer, optionally +
-- supplier), independent of any one ProjectLine/order — see schema.prisma's
-- doc comment on ProductSourceApproval and architecture-decisions.md's
-- "Quality Assurance" section for why this is a first-class table rather
-- than derived purely from order history.
CREATE TABLE [dbo].[product_source_approvals] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [productMasterId] NVARCHAR(1000) NOT NULL,
    [manufacturerId] NVARCHAR(1000) NOT NULL,
    [supplierId] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [product_source_approvals_status_df] DEFAULT 'PENDING',
    [approvedAt] DATETIME2,
    [approvedById] NVARCHAR(1000),
    [nextReviewDue] DATETIME2,
    [notes] NVARCHAR(max),
    [isArchived] BIT NOT NULL CONSTRAINT [product_source_approvals_isArchived_df] DEFAULT 0,
    [archivedAt] DATETIME2,
    [archivedById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [product_source_approvals_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [product_source_approvals_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_source_approvals_organizationId_idx] ON [dbo].[product_source_approvals]([organizationId]);
CREATE NONCLUSTERED INDEX [product_source_approvals_productMasterId_idx] ON [dbo].[product_source_approvals]([productMasterId]);
CREATE NONCLUSTERED INDEX [product_source_approvals_manufacturerId_idx] ON [dbo].[product_source_approvals]([manufacturerId]);
CREATE NONCLUSTERED INDEX [product_source_approvals_supplierId_idx] ON [dbo].[product_source_approvals]([supplierId]);

-- AddForeignKey
ALTER TABLE [dbo].[product_source_approvals] ADD CONSTRAINT [product_source_approvals_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_source_approvals] ADD CONSTRAINT [product_source_approvals_productMasterId_fkey] FOREIGN KEY ([productMasterId]) REFERENCES [dbo].[product_master]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_source_approvals] ADD CONSTRAINT [product_source_approvals_manufacturerId_fkey] FOREIGN KEY ([manufacturerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[product_source_approvals] ADD CONSTRAINT [product_source_approvals_supplierId_fkey] FOREIGN KEY ([supplierId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;
