BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[tender_contract_quality_links] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [contractId] NVARCHAR(1000) NOT NULL,
    [kind] NVARCHAR(20) NOT NULL,
    [refId] NVARCHAR(1000) NOT NULL,
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tender_contract_quality_links_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_contract_quality_links_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_contract_quality_links_contractId_kind_refId_key] UNIQUE NONCLUSTERED ([contractId],[kind],[refId])
);

CREATE NONCLUSTERED INDEX [tender_contract_quality_links_contractId_idx] ON [dbo].[tender_contract_quality_links]([contractId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
