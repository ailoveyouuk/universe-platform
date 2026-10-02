BEGIN TRAN;

-- Drops columns for fields removed from the New Stakeholder form on
-- 2026-10-02 (Lewis's platform-wide cleanup request) whose DTO/service/UI
-- layers were cleaned up at the time but whose underlying Prisma model
-- columns were missed until this pass: sales order limit and the GDP
-- Training Officer toggle on clients, and preferred incoterm / service
-- regions on freight forwarders (freight forwarder transport mode is
-- already covered by modesOfTransport).

-- gdpTrainedOfficerAssigned has a named DEFAULT constraint that must be
-- dropped before the column itself.
ALTER TABLE [dbo].[partner_client_details] DROP CONSTRAINT [partner_client_details_gdpTrainedOfficerAssigned_df];

ALTER TABLE [dbo].[partner_client_details] DROP COLUMN
    [salesOrderLimit],
    [salesOrderLimitCurrency],
    [gdpTrainedOfficerAssigned];

ALTER TABLE [dbo].[partner_freight_forwarder_details] DROP COLUMN
    [preferredIncoterm],
    [serviceRegions];

COMMIT TRAN;
