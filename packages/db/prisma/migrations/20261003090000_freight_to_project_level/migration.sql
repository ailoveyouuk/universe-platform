BEGIN TRAN;

-- Freight moved from per-line to per-project (2026-10-03, per Lewis's
-- explicit request): freight is arranged once for the whole project, not
-- individually per product line, so re-entering/recomputing it per line
-- was both wrong and tedious. Confirmed via AskUserQuestion that freight
-- becomes its own separate project-level invoice charge, NOT apportioned
-- across lines -- see Project's "Freight & Logistics" doc comment and
-- architecture-decisions.md for the full account.
--
-- incoterm/freightMode move here too (previously on project_lines'
-- "Procurement" block) since they're also a per-project commercial
-- arrangement.
--
-- Order of operations, deliberately: (1) add the new columns to
-- projects, (2) carry forward existing project_lines data into projects
-- via EXEC sp_executesql (lesson learned earlier today -- GO is not valid
-- T-SQL and prisma migrate deploy does not batch-split on it; sp_executesql
-- defers column-name resolution to runtime so no batch separator is
-- needed), (3) only then drop the old columns from project_lines, so no
-- data is lost in between.

ALTER TABLE [dbo].[projects] ADD
    [incoterm] NVARCHAR(1000),
    [freightMode] NVARCHAR(1000),
    [freightForwarderId] NVARCHAR(1000),
    [freightCost] DECIMAL(18,2),
    [freightCurrency] NCHAR(3),
    [insuredValue] DECIMAL(18,2),
    [insuredCurrency] NCHAR(3),
    [freightInsuranceCost] DECIMAL(18,2),
    [freightAdditionalCost] DECIMAL(18,2),
    [freightAdditionalCostDescription] NVARCHAR(max),
    [freightTotalCost] DECIMAL(18,2),
    [freightMarginPercent] DECIMAL(5,2),
    [freightMarginAmount] DECIMAL(18,2),
    [freightPriceLockedAt] DATETIME2,
    [freightExchangeRateSnapshotId] NVARCHAR(1000),
    [freightTotalCostReportingCcy] DECIMAL(18,2),
    [freightInvoiceAmountReportingCcy] DECIMAL(18,2),
    [reportingCurrencyCode] NCHAR(3);

-- Best-effort carry-over: one project can have many lines that each had
-- their own (previously duplicated-by-the-UI) freight entry. Picks the
-- most recently updated line's freight data per project as the project's
-- new single freight record, rather than silently dropping whatever was
-- already entered. A project with no lines, or whose lines never had
-- freight data, is simply left NULL (nothing to carry over).
EXEC sp_executesql N'
UPDATE p
SET
    p.[incoterm] = latest.[incoterm],
    p.[freightMode] = latest.[freightMode],
    p.[freightForwarderId] = latest.[freightForwarderId],
    p.[freightCost] = latest.[freightCost],
    p.[freightCurrency] = latest.[freightCurrency],
    p.[insuredValue] = latest.[insuredValue],
    p.[insuredCurrency] = latest.[insuredCurrency],
    p.[freightInsuranceCost] = latest.[freightInsuranceCost],
    p.[freightAdditionalCost] = latest.[freightAdditionalCost],
    p.[freightAdditionalCostDescription] = latest.[freightAdditionalCostDescription],
    p.[freightTotalCost] = latest.[freightTotalCost],
    p.[freightMarginPercent] = latest.[freightMarginPercent],
    p.[freightMarginAmount] = latest.[freightMarginAmount],
    p.[freightPriceLockedAt] = latest.[freightPriceLockedAt],
    p.[freightExchangeRateSnapshotId] = latest.[freightExchangeRateSnapshotId],
    p.[freightTotalCostReportingCcy] = latest.[freightTotalCostReportingCcy]
FROM [dbo].[projects] p
CROSS APPLY (
    SELECT TOP 1 pl.*
    FROM [dbo].[project_lines] pl
    WHERE pl.[projectId] = p.[id]
      AND (pl.[freightCost] IS NOT NULL OR pl.[freightForwarderId] IS NOT NULL OR pl.[incoterm] IS NOT NULL)
    ORDER BY pl.[updatedAt] DESC
) latest;
';

-- freightInvoiceAmountReportingCcy (the WITH-margin figure) is derived,
-- not carried over directly -- compute it now from the just-populated
-- freightTotalCostReportingCcy/freightMarginPercent so projects that had
-- freight data don't show a blank invoice figure until next edited.
EXEC sp_executesql N'
UPDATE [dbo].[projects]
SET [freightInvoiceAmountReportingCcy] = [freightTotalCostReportingCcy] * (1 + ISNULL([freightMarginPercent], 0) / 100.0)
WHERE [freightTotalCostReportingCcy] IS NOT NULL;
';

-- AddForeignKey (projects.freightForwarderId -> partners, projects.freightExchangeRateSnapshotId -> exchange_rate_snapshots)
ALTER TABLE [dbo].[projects] ADD CONSTRAINT [projects_freightForwarderId_fkey] FOREIGN KEY ([freightForwarderId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[projects] ADD CONSTRAINT [projects_freightExchangeRateSnapshotId_fkey] FOREIGN KEY ([freightExchangeRateSnapshotId]) REFERENCES [dbo].[exchange_rate_snapshots]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE INDEX [projects_freightForwarderId_idx] ON [dbo].[projects]([freightForwarderId]);

-- Now drop the old per-line freight columns and their constraints.
ALTER TABLE [dbo].[project_lines] DROP CONSTRAINT [project_lines_freightForwarderId_fkey];
ALTER TABLE [dbo].[project_lines] DROP CONSTRAINT [project_lines_freightExchangeRateSnapshotId_fkey];
ALTER TABLE [dbo].[project_lines] DROP COLUMN
    [incoterm],
    [freightMode],
    [freightForwarderId],
    [freightCost],
    [freightCurrency],
    [insuredValue],
    [insuredCurrency],
    [freightInsuranceCost],
    [freightAdditionalCost],
    [freightAdditionalCostDescription],
    [freightTotalCost],
    [freightMarginPercent],
    [freightMarginAmount],
    [freightPriceLockedAt],
    [freightExchangeRateSnapshotId],
    [freightTotalCostReportingCcy];

-- Rename promisedDeliveryDate -> projectedDeliveryDate (Lewis, 2026-10-03:
-- "projected" reads less like a contractual promise than what it
-- actually is -- an internal planning estimate).
EXEC sp_rename 'dbo.project_lines.promisedDeliveryDate', 'projectedDeliveryDate', 'COLUMN';

-- quantityReceived -- new, so supplierInFull below has something real to
-- compare against (previously there was no field recording what was
-- actually received, only what was ordered).
ALTER TABLE [dbo].[project_lines] ADD [quantityReceived] INT;

-- internalOnTime/supplierOnTime/supplierInFull become server-computed
-- (2026-10-03) instead of manual dropdowns -- no column type change
-- needed, they stay nullable BIT columns; application code now writes
-- them on every line save rather than the client.

COMMIT TRAN;
