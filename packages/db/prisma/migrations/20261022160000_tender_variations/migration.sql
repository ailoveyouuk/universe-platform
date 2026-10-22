BEGIN TRY

BEGIN TRAN;

-- Step 7 part 3: contract variations with approval by both parties.
CREATE TABLE [dbo].[tender_contract_variations] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [awardedOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [contractId] NVARCHAR(1000) NOT NULL,
    [number] INT NOT NULL,
    [title] NVARCHAR(300) NOT NULL,
    [reason] NVARCHAR(1000) NOT NULL,
    [newTotalValue] DECIMAL(18,2),
    [previousTotalValue] DECIMAL(18,2),
    [newEndDate] DATETIME2,
    [previousEndDate] DATETIME2,
    [termsAmendment] NVARCHAR(max),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [tender_contract_variations_status_df] DEFAULT 'PROPOSED',
    [proposedByOrganizationId] NVARCHAR(1000) NOT NULL,
    [proposedById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tender_contract_variations_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [respondedById] NVARCHAR(1000),
    [respondedAt] DATETIME2,
    [responseNote] NVARCHAR(1000),
    [appliedAt] DATETIME2,
    CONSTRAINT [tender_contract_variations_pkey] PRIMARY KEY CLUSTERED ([id])
);
CREATE NONCLUSTERED INDEX [tender_contract_variations_contractId_idx] ON [dbo].[tender_contract_variations]([contractId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
