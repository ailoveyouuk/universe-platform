BEGIN TRAN;

-- AlterTable: projects — COMPLETED sub-state (see Project.completionStage's
-- doc comment in schema.prisma; procurement-lifecycle-benchmarking.md rec. #1)
ALTER TABLE [dbo].[projects] ADD
    [completionStage] NVARCHAR(1000);

-- AlterTable: project_lines — insured value distinct from freight cost
-- (benchmarking doc rec. #5), payment restructure (rec. #2), and the
-- pharma qualification-pathway field (rec. #4).
ALTER TABLE [dbo].[project_lines] ADD
    [insuredValue] DECIMAL(18,2),
    [insuredCurrency] CHAR(3),
    [supplierAmountPaid] DECIMAL(18,2),
    [supplierPaymentStatus] NVARCHAR(1000),
    [qualificationPathway] NVARCHAR(1000),
    [qualificationPathwayExpiryDate] DATETIME2;

-- Drop the old percentage field now that supplierAmountPaid/supplierPaymentStatus
-- replace it (see supplierAmountPaid's doc comment in schema.prisma).
ALTER TABLE [dbo].[project_lines] DROP COLUMN [supplierPaymentStatusPercent];

-- CreateTable: project_status_history (see project-stage-navigation-plan.md
-- and ProjectStatusHistory's doc comment in schema.prisma)
CREATE TABLE [dbo].[project_status_history] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [projectId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [enteredAt] DATETIME2 NOT NULL CONSTRAINT [project_status_history_enteredAt_df] DEFAULT CURRENT_TIMESTAMP,
    [changedById] NVARCHAR(1000),
    CONSTRAINT [project_status_history_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE INDEX [project_status_history_organizationId_idx] ON [dbo].[project_status_history]([organizationId]);
CREATE INDEX [project_status_history_projectId_idx] ON [dbo].[project_status_history]([projectId]);

ALTER TABLE [dbo].[project_status_history] ADD CONSTRAINT [project_status_history_projectId_fkey]
    FOREIGN KEY ([projectId]) REFERENCES [dbo].[projects]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[project_status_history] ADD CONSTRAINT [project_status_history_changedById_fkey]
    FOREIGN KEY ([changedById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;
