-- Run ONCE, in the Azure Portal Query Editor, against the `universe-insights` database (not `universe`).
-- Lewis, 2026-10-25: the Insights landing page shows the most active metrics across Universe each day (projects started, lines added, quote requests and so on).
-- This creates the one table that holds those daily counts (counts only; one row per organisation hash, metric and day; published only where at least five organisations contributed).
-- Safe to re-run. No GO separators (the portal Query Editor does not support them).

IF OBJECT_ID('dbo.aggregated_daily_activity', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.aggregated_daily_activity (
        id          NVARCHAR(1000) NOT NULL,
        day         DATE NOT NULL,
        metric      NVARCHAR(1000) NOT NULL,
        eventCount  INT NOT NULL,
        sourceHash  NVARCHAR(1000) NOT NULL,
        isSimulated BIT NOT NULL CONSTRAINT aggregated_daily_activity_isSimulated_df DEFAULT 0,
        createdAt   DATETIME2 NOT NULL CONSTRAINT aggregated_daily_activity_createdAt_df DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT aggregated_daily_activity_pkey PRIMARY KEY CLUSTERED (id)
    );
    CREATE UNIQUE NONCLUSTERED INDEX aggregated_daily_activity_day_metric_sourceHash_key ON dbo.aggregated_daily_activity (day, metric, sourceHash);
    CREATE NONCLUSTERED INDEX aggregated_daily_activity_metric_day_idx ON dbo.aggregated_daily_activity (metric, day);
END;

-- Check (expect one row with 0 rows to start):
SELECT 'aggregated_daily_activity' AS tableName, COUNT(*) AS rowsNow FROM dbo.aggregated_daily_activity;
