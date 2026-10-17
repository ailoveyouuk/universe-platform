-- Run ONCE, in the Azure Portal Query Editor, against the `universe-insights` database (not `universe`).
-- Lewis, 2026-10-17: everything in the system so far is simulated demo data, so every benchmark row that exists
-- today is flagged simulated; benchmarks built from real organisations from now on are not. Real organisations
-- only ever read isSimulated = 0 rows; demo accounts read both.
-- Safe to re-run: the ALTERs are skipped if the column already exists, and the UPDATEs only touch unflagged rows
-- that existed before the flag (run it before any real organisation contributes data).

IF COL_LENGTH('dbo.aggregated_product_prices', 'isSimulated') IS NULL
    ALTER TABLE dbo.aggregated_product_prices ADD isSimulated BIT NOT NULL CONSTRAINT aggregated_product_prices_isSimulated_df DEFAULT 0;
IF COL_LENGTH('dbo.aggregated_logistics_metrics', 'isSimulated') IS NULL
    ALTER TABLE dbo.aggregated_logistics_metrics ADD isSimulated BIT NOT NULL CONSTRAINT aggregated_logistics_metrics_isSimulated_df DEFAULT 0;
IF COL_LENGTH('dbo.aggregated_product_sourcing', 'isSimulated') IS NULL
    ALTER TABLE dbo.aggregated_product_sourcing ADD isSimulated BIT NOT NULL CONSTRAINT aggregated_product_sourcing_isSimulated_df DEFAULT 0;
GO

UPDATE dbo.aggregated_product_prices SET isSimulated = 1 WHERE isSimulated = 0;
UPDATE dbo.aggregated_logistics_metrics SET isSimulated = 1 WHERE isSimulated = 0;
UPDATE dbo.aggregated_product_sourcing SET isSimulated = 1 WHERE isSimulated = 0;
GO

SELECT 'aggregated_product_prices' AS tbl, COUNT(*) AS rows_flagged FROM dbo.aggregated_product_prices WHERE isSimulated = 1
UNION ALL SELECT 'aggregated_logistics_metrics', COUNT(*) FROM dbo.aggregated_logistics_metrics WHERE isSimulated = 1
UNION ALL SELECT 'aggregated_product_sourcing', COUNT(*) FROM dbo.aggregated_product_sourcing WHERE isSimulated = 1;
