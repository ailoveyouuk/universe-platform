BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[quality_scorecard_settings] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [onTimeGood] INT NOT NULL CONSTRAINT [quality_scorecard_settings_onTimeGood_df] DEFAULT 95,
    [onTimeWarn] INT NOT NULL CONSTRAINT [quality_scorecard_settings_onTimeWarn_df] DEFAULT 85,
    [inFullGood] INT NOT NULL CONSTRAINT [quality_scorecard_settings_inFullGood_df] DEFAULT 95,
    [inFullWarn] INT NOT NULL CONSTRAINT [quality_scorecard_settings_inFullWarn_df] DEFAULT 85,
    [otifGood] INT NOT NULL CONSTRAINT [quality_scorecard_settings_otifGood_df] DEFAULT 90,
    [otifWarn] INT NOT NULL CONSTRAINT [quality_scorecard_settings_otifWarn_df] DEFAULT 80,
    [earlyDays] INT NOT NULL CONSTRAINT [quality_scorecard_settings_earlyDays_df] DEFAULT 30,
    [lateDays] INT NOT NULL CONSTRAINT [quality_scorecard_settings_lateDays_df] DEFAULT 5,
    [updatedById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [quality_scorecard_settings_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [quality_scorecard_settings_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [quality_scorecard_settings_organizationId_key] UNIQUE NONCLUSTERED ([organizationId])
);

-- AddForeignKey
ALTER TABLE [dbo].[quality_scorecard_settings] ADD CONSTRAINT [quality_scorecard_settings_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

