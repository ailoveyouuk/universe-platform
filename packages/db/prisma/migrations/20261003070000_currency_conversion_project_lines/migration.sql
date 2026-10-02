BEGIN TRAN;

-- Currency conversion for ProjectLine pricing (2026-10-02). Lewis's
-- direction: product price wired per line as unit price AND total (unit
-- price x quantity), in the price's own native currency, converted to
-- Unimed's reporting currency at the FX rate for the day the price was
-- last entered/changed, and that conversion LOCKED from then on (never
-- re-fluctuates with a later day's rate). See ExchangeRateSnapshot's and
-- ProjectLine's "Currency conversion" doc comments in schema.prisma, and
-- ExchangeRatesService in apps/api for the fetch/cache/convert logic.

-- CreateTable: exchange_rate_snapshots — daily FX rate cache, not
-- tenant-scoped (an FX rate is the same fact for every organization), same
-- category as product_master/regions/countries in infra/sql/row-level-
-- security.sql's exclusion list -- nothing to add there for this table.
CREATE TABLE [dbo].[exchange_rate_snapshots] (
    [id] NVARCHAR(1000) NOT NULL,
    [date] DATE NOT NULL,
    [baseCurrencyCode] CHAR(3) NOT NULL,
    [ratesJson] NVARCHAR(max) NOT NULL,
    [source] NVARCHAR(1000) NOT NULL CONSTRAINT [exchange_rate_snapshots_source_df] DEFAULT 'frankfurter',
    [fetchedAt] DATETIME2 NOT NULL CONSTRAINT [exchange_rate_snapshots_fetchedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [exchange_rate_snapshots_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE UNIQUE NONCLUSTERED INDEX [exchange_rate_snapshots_date_baseCurrencyCode_key] ON [dbo].[exchange_rate_snapshots]([date], [baseCurrencyCode]);

-- AlterTable: project_lines — see ProjectLine's "Currency conversion" block
-- in schema.prisma. supplierPaymentAmountTotal/clientPaymentAmount (already
-- existing columns) become server-computed (unitPrice x quantity) as of
-- this same change — no column change needed for that, just API behaviour.
ALTER TABLE [dbo].[project_lines] ADD
    [reportingCurrencyCode] CHAR(3),
    [supplierPriceLockedAt] DATETIME2,
    [supplierExchangeRateSnapshotId] NVARCHAR(1000),
    [supplierUnitPriceReportingCcy] DECIMAL(18,2),
    [supplierTotalPriceReportingCcy] DECIMAL(18,2),
    [salesPriceLockedAt] DATETIME2,
    [salesExchangeRateSnapshotId] NVARCHAR(1000),
    [salesUnitPriceReportingCcy] DECIMAL(18,2),
    [salesTotalPriceReportingCcy] DECIMAL(18,2);

-- AddForeignKey
ALTER TABLE [dbo].[project_lines] ADD CONSTRAINT [project_lines_supplierExchangeRateSnapshotId_fkey] FOREIGN KEY ([supplierExchangeRateSnapshotId]) REFERENCES [dbo].[exchange_rate_snapshots]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[project_lines] ADD CONSTRAINT [project_lines_salesExchangeRateSnapshotId_fkey] FOREIGN KEY ([salesExchangeRateSnapshotId]) REFERENCES [dbo].[exchange_rate_snapshots]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;
