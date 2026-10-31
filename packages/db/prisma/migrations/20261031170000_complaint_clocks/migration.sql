BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[quality_scorecard_settings] ADD [ackWorkingDays] INT NOT NULL CONSTRAINT [quality_scorecard_settings_ackWorkingDays_df] DEFAULT 2,
[triageWorkingDays] INT NOT NULL CONSTRAINT [quality_scorecard_settings_triageWorkingDays_df] DEFAULT 5,
[triageSeriousWorkingDays] INT NOT NULL CONSTRAINT [quality_scorecard_settings_triageSeriousWorkingDays_df] DEFAULT 1,
[resolveMinorDays] INT NOT NULL CONSTRAINT [quality_scorecard_settings_resolveMinorDays_df] DEFAULT 30,
[resolveMajorDays] INT NOT NULL CONSTRAINT [quality_scorecard_settings_resolveMajorDays_df] DEFAULT 15,
[resolveCriticalDays] INT NOT NULL CONSTRAINT [quality_scorecard_settings_resolveCriticalDays_df] DEFAULT 5,
[partnerResponseDays] INT NOT NULL CONSTRAINT [quality_scorecard_settings_partnerResponseDays_df] DEFAULT 14;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
