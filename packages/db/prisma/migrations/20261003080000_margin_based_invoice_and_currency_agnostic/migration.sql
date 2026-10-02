BEGIN TRAN;

-- Full financial-field scoping (2026-10-03). Lewis's direction: no field
-- currency is hardcoded to any one organisation (Universe is a global,
-- tenant-agnostic platform -- the previous round's GBP-reporting-currency
-- default was Unimed-specific and has been corrected in application code,
-- not the schema -- see ExchangeRatesService.DEFAULT_BASE_CURRENCY).
-- This migration adds: a freight cost breakdown (insurance premium,
-- additional costs, computed pre-margin total), per-line product/freight
-- margin percentages + computed amounts, and freight's own FX lock
-- (freight can be priced in a different native currency than the
-- product). See ProjectLine's "Margin-based client invoice build" and
-- "Currency conversion" doc comments in schema.prisma for the full design.

ALTER TABLE [dbo].[project_lines] ADD
    [freightInsuranceCost] DECIMAL(18,2),
    [freightAdditionalCost] DECIMAL(18,2),
    [freightAdditionalCostDescription] NVARCHAR(max),
    [freightTotalCost] DECIMAL(18,2),
    [productMarginPercent] DECIMAL(5,2),
    [productMarginAmount] DECIMAL(18,2),
    [freightMarginPercent] DECIMAL(5,2),
    [freightMarginAmount] DECIMAL(18,2),
    [freightPriceLockedAt] DATETIME2,
    [freightExchangeRateSnapshotId] NVARCHAR(1000),
    [freightTotalCostReportingCcy] DECIMAL(18,2);

-- AddForeignKey
ALTER TABLE [dbo].[project_lines] ADD CONSTRAINT [project_lines_freightExchangeRateSnapshotId_fkey] FOREIGN KEY ([freightExchangeRateSnapshotId]) REFERENCES [dbo].[exchange_rate_snapshots]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;
