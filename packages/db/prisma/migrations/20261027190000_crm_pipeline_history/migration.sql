BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[crm_opportunities] ADD [commodityGroup] NVARCHAR(40);

CREATE TABLE [dbo].[crm_opportunity_events] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [opportunityId] NVARCHAR(1000) NOT NULL,
    [eventType] NVARCHAR(12) NOT NULL,
    [fromStage] NVARCHAR(20),
    [toStage] NVARCHAR(20),
    [oldValue] DECIMAL(18,2),
    [newValue] DECIMAL(18,2),
    [currency] CHAR(3),
    [oldDate] DATETIME2,
    [newDate] DATETIME2,
    [reason] NVARCHAR(500),
    [changedById] NVARCHAR(1000),
    [occurredAt] DATETIME2 NOT NULL CONSTRAINT [crm_opportunity_events_occurredAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [crm_opportunity_events_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [crm_opportunity_events_organizationId_opportunityId_occurredAt_idx] ON [dbo].[crm_opportunity_events]([organizationId], [opportunityId], [occurredAt]);
CREATE NONCLUSTERED INDEX [crm_opportunity_events_organizationId_eventType_idx] ON [dbo].[crm_opportunity_events]([organizationId], [eventType]);

ALTER TABLE [dbo].[crm_opportunity_events] ADD CONSTRAINT [crm_opportunity_events_opportunityId_fkey] FOREIGN KEY ([opportunityId]) REFERENCES [dbo].[crm_opportunities]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
