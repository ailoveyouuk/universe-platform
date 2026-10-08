BEGIN TRAN;

-- Supply-chain CO2 / distance / efficiency measurement (2026-10-08) — see
-- supply-chain-co2-efficiency.md (project docs) and schema.prisma's
-- ProjectLineLogisticsMetric doc comment for the full writeup.

-- 1. Net cargo weight on project_lines (optional, retrofit).
ALTER TABLE [dbo].[project_lines] ADD [weightKg] DECIMAL(12,3);

-- 2. Country centroid coordinates (nullable, seeded separately via
--    packages/db/scripts/seed-country-centroids.ts).
ALTER TABLE [dbo].[countries] ADD [latitude] FLOAT;
ALTER TABLE [dbo].[countries] ADD [longitude] FLOAT;

-- 3. One computed metrics row per project line.
CREATE TABLE [dbo].[project_line_logistics_metrics] (
  [id] NVARCHAR(1000) NOT NULL,
  [organizationId] NVARCHAR(1000) NOT NULL,
  [projectId] NVARCHAR(1000) NOT NULL,
  [projectLineId] NVARCHAR(1000) NOT NULL,
  [manufactureCountryCode] NVARCHAR(1000),
  [destinationCountryCode] NVARCHAR(1000),
  [transportMode] NVARCHAR(1000),
  [incoterm] NVARCHAR(1000),
  [commodityGroup] NVARCHAR(1000),
  [weightKgUsed] DECIMAL(12,3),
  [weightEstimated] BIT NOT NULL CONSTRAINT [project_line_logistics_metrics_weightEstimated_df] DEFAULT 0,
  [distanceKm] DECIMAL(10,1) NOT NULL,
  [co2FactorKgPerTonneKm] DECIMAL(10,4) NOT NULL,
  [co2TotalKg] DECIMAL(14,2) NOT NULL,
  [durationDays] INT,
  [efficiencyScore] INT NOT NULL,
  [scoreBand] NVARCHAR(1000) NOT NULL,
  [methodologyVersion] NVARCHAR(1000) NOT NULL CONSTRAINT [project_line_logistics_metrics_methodologyVersion_df] DEFAULT '2026.10-v1',
  [calculatedAt] DATETIME2 NOT NULL CONSTRAINT [project_line_logistics_metrics_calculatedAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [project_line_logistics_metrics_pkey] PRIMARY KEY ([id]),
  CONSTRAINT [project_line_logistics_metrics_projectLineId_key] UNIQUE ([projectLineId])
);

ALTER TABLE [dbo].[project_line_logistics_metrics] ADD CONSTRAINT [project_line_logistics_metrics_projectLineId_fkey] FOREIGN KEY ([projectLineId]) REFERENCES [dbo].[project_lines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX [project_line_logistics_metrics_organizationId_idx] ON [dbo].[project_line_logistics_metrics]([organizationId]);
CREATE INDEX [project_line_logistics_metrics_projectId_idx] ON [dbo].[project_line_logistics_metrics]([projectId]);
CREATE INDEX [project_line_logistics_metrics_manufactureCountryCode_destinationCountryCode_idx] ON [dbo].[project_line_logistics_metrics]([manufactureCountryCode], [destinationCountryCode]);
CREATE INDEX [project_line_logistics_metrics_transportMode_idx] ON [dbo].[project_line_logistics_metrics]([transportMode]);

COMMIT TRAN;
