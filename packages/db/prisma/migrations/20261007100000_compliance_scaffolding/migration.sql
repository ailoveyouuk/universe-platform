BEGIN TRAN;

-- Compliance scaffolding, 2026-10-07 — see
-- claude/compliance-standards-gap-analysis.md. Two parts:
--
-- (1) A genuine RLS gap found while adding Gap 1's audit trail: the three
-- existing stakeholder-evidence tables (partner_certifications,
-- partner_company_checks, partner_approval_history) were never given an
-- organizationId column and were never added to
-- infra/sql/row-level-security.sql's table list, so a raw query against
-- them had no database-layer RLS backstop -- only the partnerId -> partners
-- join gave them any tenant scoping, and only when a caller remembered to
-- make that join. Backfilled from each row's own partner's organizationId
-- via EXEC sp_executesql (same reason as every other migration this
-- session: GO is not valid T-SQL and prisma migrate deploy does not
-- batch-split on it).
--
-- (2) Two new generic tables: field_change_log (Gap 1 -- a real,
-- field-level audit trail) and risk_assessments (Gap 4 -- a minimal,
-- generic risk register).

-- --- Part 1: organizationId backfill on the three existing tables ---

ALTER TABLE [dbo].[partner_certifications] ADD [organizationId] NVARCHAR(1000);
ALTER TABLE [dbo].[partner_company_checks] ADD [organizationId] NVARCHAR(1000);
ALTER TABLE [dbo].[partner_approval_history] ADD [organizationId] NVARCHAR(1000), [certificationStatement] NVARCHAR(MAX);

EXEC sp_executesql N'
UPDATE pc
SET pc.[organizationId] = p.[organizationId]
FROM [dbo].[partner_certifications] pc
JOIN [dbo].[partners] p ON p.[id] = pc.[partnerId];
';

EXEC sp_executesql N'
UPDATE pcc
SET pcc.[organizationId] = p.[organizationId]
FROM [dbo].[partner_company_checks] pcc
JOIN [dbo].[partners] p ON p.[id] = pcc.[partnerId];
';

EXEC sp_executesql N'
UPDATE pah
SET pah.[organizationId] = p.[organizationId]
FROM [dbo].[partner_approval_history] pah
JOIN [dbo].[partners] p ON p.[id] = pah.[partnerId];
';

-- Now that every existing row is backfilled, make the column mandatory
-- (matches the Prisma schema's non-nullable organizationId) and add the FK
-- + index, same convention as every other tenant table.
ALTER TABLE [dbo].[partner_certifications] ALTER COLUMN [organizationId] NVARCHAR(1000) NOT NULL;
ALTER TABLE [dbo].[partner_company_checks] ALTER COLUMN [organizationId] NVARCHAR(1000) NOT NULL;
ALTER TABLE [dbo].[partner_approval_history] ALTER COLUMN [organizationId] NVARCHAR(1000) NOT NULL;

ALTER TABLE [dbo].[partner_certifications] ADD CONSTRAINT [partner_certifications_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[partner_company_checks] ADD CONSTRAINT [partner_company_checks_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[partner_approval_history] ADD CONSTRAINT [partner_approval_history_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX [partner_certifications_organizationId_idx] ON [dbo].[partner_certifications]([organizationId]);
CREATE INDEX [partner_company_checks_organizationId_idx] ON [dbo].[partner_company_checks]([organizationId]);
CREATE INDEX [partner_approval_history_organizationId_idx] ON [dbo].[partner_approval_history]([organizationId]);

-- --- Part 2: field_change_log (Gap 1) ---

CREATE TABLE [dbo].[field_change_log] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tableName] NVARCHAR(1000) NOT NULL,
    [recordId] NVARCHAR(1000) NOT NULL,
    [fieldName] NVARCHAR(1000) NOT NULL,
    [oldValue] NVARCHAR(MAX),
    [newValue] NVARCHAR(MAX),
    [changedById] NVARCHAR(1000),
    [changedAt] DATETIME2 NOT NULL CONSTRAINT [field_change_log_changedAt_default] DEFAULT CURRENT_TIMESTAMP,
    [reason] NVARCHAR(MAX),
    [source] NVARCHAR(1000) NOT NULL CONSTRAINT [field_change_log_source_default] DEFAULT 'API',
    [certificationStatement] NVARCHAR(MAX),
    CONSTRAINT [field_change_log_pkey] PRIMARY KEY ([id])
);

ALTER TABLE [dbo].[field_change_log] ADD CONSTRAINT [field_change_log_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX [field_change_log_organizationId_idx] ON [dbo].[field_change_log]([organizationId]);
CREATE INDEX [field_change_log_tableName_recordId_idx] ON [dbo].[field_change_log]([tableName], [recordId]);
CREATE INDEX [field_change_log_changedAt_idx] ON [dbo].[field_change_log]([changedAt]);

-- --- Part 3: risk_assessments (Gap 4) ---

CREATE TABLE [dbo].[risk_assessments] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [subjectType] NVARCHAR(1000) NOT NULL,
    [subjectId] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(MAX),
    [severity] NVARCHAR(1000) NOT NULL,
    [likelihood] NVARCHAR(1000) NOT NULL,
    [mitigation] NVARCHAR(MAX),
    [ownerId] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [risk_assessments_status_default] DEFAULT 'OPEN',
    [reviewDate] DATETIME2,
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [risk_assessments_createdAt_default] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [risk_assessments_pkey] PRIMARY KEY ([id])
);

ALTER TABLE [dbo].[risk_assessments] ADD CONSTRAINT [risk_assessments_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[risk_assessments] ADD CONSTRAINT [risk_assessments_ownerId_fkey] FOREIGN KEY ([ownerId]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX [risk_assessments_organizationId_idx] ON [dbo].[risk_assessments]([organizationId]);
CREATE INDEX [risk_assessments_subjectType_subjectId_idx] ON [dbo].[risk_assessments]([subjectType], [subjectId]);
CREATE INDEX [risk_assessments_reviewDate_idx] ON [dbo].[risk_assessments]([reviewDate]);

COMMIT TRAN;
