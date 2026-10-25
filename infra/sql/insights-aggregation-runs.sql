-- Run ONCE, in the Azure Portal Query Editor, against the `universe-insights` database (not `universe`).
-- Lewis, 2026-10-25: the nightly aggregation (prices, sourcing, logistics, freight, services) adds rows each time it runs. This small table records when each
-- pipeline last finished successfully, so the next night reads only what changed since then and nothing is counted twice. It holds no organisation data.
-- Safe to re-run. No GO separators (the portal Query Editor does not support them).

IF OBJECT_ID('dbo.aggregation_runs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.aggregation_runs (
        pipeline  NVARCHAR(100) NOT NULL,
        lastRunAt DATETIME2(3) NOT NULL,
        updatedAt DATETIME2(3) NOT NULL CONSTRAINT aggregation_runs_updatedAt_df DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT aggregation_runs_pkey PRIMARY KEY CLUSTERED (pipeline)
    );
END;

-- Check (expect 0 rows to start):
SELECT 'aggregation_runs' AS tableName, COUNT(*) AS rowsNow FROM dbo.aggregation_runs;
