BEGIN TRAN;

-- GDP gap-closing build, 2026-10-07 — see
-- claude/compliance-standards-gap-analysis.md's "GDP compliance assessment"
-- addendum. Four new tenant-scoped tables (Gap 3: evidence_standard_
-- definitions, stakeholder_evidence_records; Gaps 5/6: product_batches,
-- batch_temperature_logs) plus one new nullable FK column on project_lines
-- (productBatchId) and one on project_documents' reverse side (no column
-- needed there — stakeholder_evidence_records.documentId is the FK).
--
-- GO is not valid T-SQL and `prisma migrate deploy` does not batch-split on
-- it (same note as every migration this project has written since
-- 20261003090000) — this file is one continuous batch.

CREATE TABLE [dbo].[evidence_standard_definitions] (
  [id] NVARCHAR(1000) NOT NULL,
  [organizationId] NVARCHAR(1000) NOT NULL,
  [name] NVARCHAR(1000) NOT NULL,
  [description] NVARCHAR(MAX),
  [category] NVARCHAR(1000) NOT NULL,
  [appliesToStakeholderTypes] NVARCHAR(MAX) NOT NULL,
  [evidenceType] NVARCHAR(1000) NOT NULL,
  [isMandatory] BIT NOT NULL CONSTRAINT [evidence_standard_definitions_isMandatory_df] DEFAULT 1,
  [requiresExpiry] BIT NOT NULL CONSTRAINT [evidence_standard_definitions_requiresExpiry_df] DEFAULT 0,
  [reVerificationFrequencyMonths] INT,
  [active] BIT NOT NULL CONSTRAINT [evidence_standard_definitions_active_df] DEFAULT 1,
  [sortOrder] INT NOT NULL CONSTRAINT [evidence_standard_definitions_sortOrder_df] DEFAULT 0,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [evidence_standard_definitions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [evidence_standard_definitions_pkey] PRIMARY KEY ([id])
);

ALTER TABLE [dbo].[evidence_standard_definitions] ADD CONSTRAINT [evidence_standard_definitions_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX [evidence_standard_definitions_organizationId_idx] ON [dbo].[evidence_standard_definitions]([organizationId]);
CREATE INDEX [evidence_standard_definitions_organizationId_active_idx] ON [dbo].[evidence_standard_definitions]([organizationId], [active]);

CREATE TABLE [dbo].[stakeholder_evidence_records] (
  [id] NVARCHAR(1000) NOT NULL,
  [organizationId] NVARCHAR(1000) NOT NULL,
  [partnerId] NVARCHAR(1000) NOT NULL,
  [standardId] NVARCHAR(1000) NOT NULL,
  [referenceNumber] NVARCHAR(1000),
  [issuingBody] NVARCHAR(1000),
  [issuedDate] DATETIME2,
  [expiryDate] DATETIME2,
  [result] NVARCHAR(1000),
  [documentId] NVARCHAR(1000),
  [status] NVARCHAR(1000) NOT NULL CONSTRAINT [stakeholder_evidence_records_status_df] DEFAULT 'PENDING',
  [verifiedById] NVARCHAR(1000),
  [verifiedAt] DATETIME2,
  [notes] NVARCHAR(MAX),
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [stakeholder_evidence_records_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [stakeholder_evidence_records_pkey] PRIMARY KEY ([id])
);

ALTER TABLE [dbo].[stakeholder_evidence_records] ADD CONSTRAINT [stakeholder_evidence_records_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[stakeholder_evidence_records] ADD CONSTRAINT [stakeholder_evidence_records_partnerId_fkey] FOREIGN KEY ([partnerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[stakeholder_evidence_records] ADD CONSTRAINT [stakeholder_evidence_records_standardId_fkey] FOREIGN KEY ([standardId]) REFERENCES [dbo].[evidence_standard_definitions]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[stakeholder_evidence_records] ADD CONSTRAINT [stakeholder_evidence_records_documentId_fkey] FOREIGN KEY ([documentId]) REFERENCES [dbo].[project_documents]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX [stakeholder_evidence_records_organizationId_idx] ON [dbo].[stakeholder_evidence_records]([organizationId]);
CREATE INDEX [stakeholder_evidence_records_partnerId_idx] ON [dbo].[stakeholder_evidence_records]([partnerId]);
CREATE INDEX [stakeholder_evidence_records_standardId_idx] ON [dbo].[stakeholder_evidence_records]([standardId]);
CREATE INDEX [stakeholder_evidence_records_expiryDate_idx] ON [dbo].[stakeholder_evidence_records]([expiryDate]);

CREATE TABLE [dbo].[product_batches] (
  [id] NVARCHAR(1000) NOT NULL,
  [organizationId] NVARCHAR(1000) NOT NULL,
  [productMasterId] NVARCHAR(1000),
  [manufacturerId] NVARCHAR(1000),
  [batchNumber] NVARCHAR(1000) NOT NULL,
  [manufacturedDate] DATETIME2,
  [expiryDate] DATETIME2,
  [storageConditions] NVARCHAR(1000),
  [qualificationPathway] NVARCHAR(1000),
  [qualificationPathwayExpiryDate] DATETIME2,
  [maPl] NVARCHAR(1000),
  [status] NVARCHAR(1000) NOT NULL CONSTRAINT [product_batches_status_df] DEFAULT 'ACTIVE',
  [notes] NVARCHAR(MAX),
  [createdById] NVARCHAR(1000),
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [product_batches_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [product_batches_pkey] PRIMARY KEY ([id])
);

ALTER TABLE [dbo].[product_batches] ADD CONSTRAINT [product_batches_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[product_batches] ADD CONSTRAINT [product_batches_productMasterId_fkey] FOREIGN KEY ([productMasterId]) REFERENCES [dbo].[product_master]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[product_batches] ADD CONSTRAINT [product_batches_manufacturerId_fkey] FOREIGN KEY ([manufacturerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX [product_batches_organizationId_idx] ON [dbo].[product_batches]([organizationId]);
CREATE INDEX [product_batches_organizationId_batchNumber_idx] ON [dbo].[product_batches]([organizationId], [batchNumber]);
CREATE INDEX [product_batches_productMasterId_idx] ON [dbo].[product_batches]([productMasterId]);
CREATE INDEX [product_batches_manufacturerId_idx] ON [dbo].[product_batches]([manufacturerId]);
CREATE INDEX [product_batches_status_idx] ON [dbo].[product_batches]([status]);

CREATE TABLE [dbo].[batch_temperature_logs] (
  [id] NVARCHAR(1000) NOT NULL,
  [organizationId] NVARCHAR(1000) NOT NULL,
  [productBatchId] NVARCHAR(1000) NOT NULL,
  [projectLineId] NVARCHAR(1000),
  [loggerReference] NVARCHAR(1000),
  [readingSummary] NVARCHAR(MAX),
  [hasExcursion] BIT NOT NULL CONSTRAINT [batch_temperature_logs_hasExcursion_df] DEFAULT 0,
  [excursionNotes] NVARCHAR(MAX),
  [reviewed] BIT NOT NULL CONSTRAINT [batch_temperature_logs_reviewed_df] DEFAULT 0,
  [reviewedById] NVARCHAR(1000),
  [reviewedAt] DATETIME2,
  [recordedAt] DATETIME2 NOT NULL CONSTRAINT [batch_temperature_logs_recordedAt_df] DEFAULT CURRENT_TIMESTAMP,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [batch_temperature_logs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [batch_temperature_logs_pkey] PRIMARY KEY ([id])
);

ALTER TABLE [dbo].[batch_temperature_logs] ADD CONSTRAINT [batch_temperature_logs_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[batch_temperature_logs] ADD CONSTRAINT [batch_temperature_logs_productBatchId_fkey] FOREIGN KEY ([productBatchId]) REFERENCES [dbo].[product_batches]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX [batch_temperature_logs_organizationId_idx] ON [dbo].[batch_temperature_logs]([organizationId]);
CREATE INDEX [batch_temperature_logs_productBatchId_idx] ON [dbo].[batch_temperature_logs]([productBatchId]);

-- New nullable FK on project_lines, linking to the new product_batches
-- table (additive — the existing free-text batchNumber column is untouched).
ALTER TABLE [dbo].[project_lines] ADD [productBatchId] NVARCHAR(1000);
ALTER TABLE [dbo].[project_lines] ADD CONSTRAINT [project_lines_productBatchId_fkey] FOREIGN KEY ([productBatchId]) REFERENCES [dbo].[product_batches]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE INDEX [project_lines_productBatchId_idx] ON [dbo].[project_lines]([productBatchId]);

COMMIT TRAN;
