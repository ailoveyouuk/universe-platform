-- Run ONCE, in the Azure Portal Query Editor, against the `universe-insights` database (not `universe`).
-- Lewis, 2026-10-25: Insights now carries anonymised FREIGHT cost (per tonne and per tonne-km, before margin) and SERVICE cost
-- (consultancy, technical assistance and the other service types, before margin). This creates the two tables that hold them.
-- Safe to re-run (each table is created only if it is missing). No GO separators (the portal Query Editor does not support them).
-- After it has run, tell Claude: the "Seed demo benchmarks" workflow then adds simulated rows so the demo shows the new views.

IF OBJECT_ID('dbo.aggregated_freight_costs', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.aggregated_freight_costs (
        id                NVARCHAR(1000) NOT NULL,
        freightMode       NVARCHAR(1000) NOT NULL,
        incoterm          NVARCHAR(1000) NULL,
        originRegion      NVARCHAR(1000) NULL,
        destinationRegion NVARCHAR(1000) NULL,
        weightBand        NVARCHAR(1000) NOT NULL,
        distanceKm        DECIMAL(10,1) NOT NULL,
        costPerTonne      DECIMAL(18,2) NOT NULL,
        costPerTonneKm    DECIMAL(18,4) NOT NULL,
        currency          CHAR(3) NOT NULL,
        effectiveMonth    DATETIME2 NOT NULL,
        sourceHash        NVARCHAR(1000) NOT NULL,
        isSimulated       BIT NOT NULL CONSTRAINT aggregated_freight_costs_isSimulated_df DEFAULT 0,
        createdAt         DATETIME2 NOT NULL CONSTRAINT aggregated_freight_costs_createdAt_df DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT aggregated_freight_costs_pkey PRIMARY KEY CLUSTERED (id)
    );
    CREATE NONCLUSTERED INDEX aggregated_freight_costs_freightMode_effectiveMonth_idx ON dbo.aggregated_freight_costs (freightMode, effectiveMonth);
END;

IF OBJECT_ID('dbo.aggregated_service_prices', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.aggregated_service_prices (
        id              NVARCHAR(1000) NOT NULL,
        serviceCategory NVARCHAR(1000) NOT NULL,
        pricingBasis    NVARCHAR(1000) NOT NULL,
        unitPrice       DECIMAL(18,2) NOT NULL,
        currency        CHAR(3) NOT NULL,
        effectiveMonth  DATETIME2 NOT NULL,
        deliveryRegion  NVARCHAR(1000) NULL,
        quantity        INT NULL,
        sourceHash      NVARCHAR(1000) NOT NULL,
        isSimulated     BIT NOT NULL CONSTRAINT aggregated_service_prices_isSimulated_df DEFAULT 0,
        createdAt       DATETIME2 NOT NULL CONSTRAINT aggregated_service_prices_createdAt_df DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT aggregated_service_prices_pkey PRIMARY KEY CLUSTERED (id)
    );
    CREATE NONCLUSTERED INDEX aggregated_service_prices_serviceCategory_effectiveMonth_idx ON dbo.aggregated_service_prices (serviceCategory, effectiveMonth);
END;

-- Check (expect two rows, both with 0 rows to start):
SELECT 'aggregated_freight_costs' AS tableName, COUNT(*) AS rowsNow FROM dbo.aggregated_freight_costs
UNION ALL SELECT 'aggregated_service_prices', COUNT(*) FROM dbo.aggregated_service_prices;
