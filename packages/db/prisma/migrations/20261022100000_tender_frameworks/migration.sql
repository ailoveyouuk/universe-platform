BEGIN TRY

BEGIN TRAN;

-- Step 7 part 2: framework terms on the tender, call-offs, price reviews and approval settings.
ALTER TABLE [dbo].[tenders] ADD [frameworkTermMonths] INT, [frameworkCeiling] DECIMAL(18,2), [frameworkCallOffMethod] NVARCHAR(20), [frameworkPriceHoldDays] INT;

CREATE TABLE [dbo].[tender_approval_settings] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [individualLimit] DECIMAL(18,2) NOT NULL CONSTRAINT [tender_approval_settings_individualLimit_df] DEFAULT 25000,
    [splitWindowDays] INT NOT NULL CONSTRAINT [tender_approval_settings_splitWindowDays_df] DEFAULT 30,
    [confirmedAt] DATETIME2,
    [updatedById] NVARCHAR(1000),
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [tender_approval_settings_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_approval_settings_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_approval_settings_organizationId_key] UNIQUE NONCLUSTERED ([organizationId])
);

CREATE TABLE [dbo].[tender_call_offs] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [awardedOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [contractId] NVARCHAR(1000) NOT NULL,
    [reference] NVARCHAR(100) NOT NULL,
    [method] NVARCHAR(20) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [tender_call_offs_status_df] DEFAULT 'PENDING_APPROVAL',
    [currency] CHAR(3),
    [totalValue] DECIMAL(18,2) NOT NULL,
    [testedValue] DECIMAL(18,2) NOT NULL,
    [requiresSecondApproval] BIT NOT NULL CONSTRAINT [tender_call_offs_requiresSecondApproval_df] DEFAULT 0,
    [ceilingExceeded] BIT NOT NULL CONSTRAINT [tender_call_offs_ceilingExceeded_df] DEFAULT 0,
    [deliveryCountryCode] CHAR(2),
    [requiredBy] DATETIME2,
    [notes] NVARCHAR(1000),
    [raisedById] NVARCHAR(1000) NOT NULL,
    [firstApprovedById] NVARCHAR(1000),
    [firstApprovedAt] DATETIME2,
    [secondApprovedById] NVARCHAR(1000),
    [secondApprovedAt] DATETIME2,
    [rejectedReason] NVARCHAR(1000),
    [respondedAt] DATETIME2,
    [declineReason] NVARCHAR(1000),
    [supplierProjectId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tender_call_offs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_call_offs_pkey] PRIMARY KEY CLUSTERED ([id])
);
CREATE NONCLUSTERED INDEX [tender_call_offs_tenderId_idx] ON [dbo].[tender_call_offs]([tenderId]);
CREATE NONCLUSTERED INDEX [tender_call_offs_contractId_idx] ON [dbo].[tender_call_offs]([contractId]);
CREATE NONCLUSTERED INDEX [tender_call_offs_awardedOrganizationId_idx] ON [dbo].[tender_call_offs]([awardedOrganizationId]);

CREATE TABLE [dbo].[tender_call_off_lines] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [awardedOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [callOffId] NVARCHAR(1000) NOT NULL,
    [tenderLineId] NVARCHAR(1000) NOT NULL,
    [quantity] DECIMAL(18,3) NOT NULL,
    [unitPrice] DECIMAL(18,4) NOT NULL,
    [lineTotal] DECIMAL(18,2) NOT NULL,
    CONSTRAINT [tender_call_off_lines_pkey] PRIMARY KEY CLUSTERED ([id])
);
CREATE NONCLUSTERED INDEX [tender_call_off_lines_callOffId_idx] ON [dbo].[tender_call_off_lines]([callOffId]);

CREATE TABLE [dbo].[tender_price_reviews] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [awardedOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [contractId] NVARCHAR(1000) NOT NULL,
    [tenderLineId] NVARCHAR(1000) NOT NULL,
    [previousPrice] DECIMAL(18,4) NOT NULL,
    [proposedPrice] DECIMAL(18,4) NOT NULL,
    [reason] NVARCHAR(1000) NOT NULL,
    [proposedByOrganizationId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [tender_price_reviews_status_df] DEFAULT 'PROPOSED',
    [respondedAt] DATETIME2,
    [responseNote] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tender_price_reviews_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_price_reviews_pkey] PRIMARY KEY CLUSTERED ([id])
);
CREATE NONCLUSTERED INDEX [tender_price_reviews_contractId_idx] ON [dbo].[tender_price_reviews]([contractId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
