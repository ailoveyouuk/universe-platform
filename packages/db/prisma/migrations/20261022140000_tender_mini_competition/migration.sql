BEGIN TRY

BEGIN TRAN;

-- Step 7 part 2b: mini-competition between framework suppliers.
ALTER TABLE [dbo].[tender_call_offs] ADD [quoteId] NVARCHAR(1000);

CREATE TABLE [dbo].[tender_mini_competitions] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [reference] NVARCHAR(100) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [tender_mini_competitions_status_df] DEFAULT 'OPEN',
    [notes] NVARCHAR(1000),
    [deliveryCountryCode] CHAR(2),
    [requiredBy] DATETIME2,
    [closesAt] DATETIME2 NOT NULL,
    [linesJson] NVARCHAR(max) NOT NULL,
    [awardedQuoteId] NVARCHAR(1000),
    [awardReason] NVARCHAR(1000),
    [cancelReason] NVARCHAR(1000),
    [createdById] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tender_mini_competitions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_mini_competitions_pkey] PRIMARY KEY CLUSTERED ([id])
);
CREATE NONCLUSTERED INDEX [tender_mini_competitions_tenderId_idx] ON [dbo].[tender_mini_competitions]([tenderId]);

CREATE TABLE [dbo].[tender_call_off_quotes] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [awardedOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [competitionId] NVARCHAR(1000) NOT NULL,
    [contractId] NVARCHAR(1000) NOT NULL,
    [reference] NVARCHAR(100) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [tender_call_off_quotes_status_df] DEFAULT 'INVITED',
    [closesAt] DATETIME2 NOT NULL,
    [requestNotes] NVARCHAR(1000),
    [deliveryCountryCode] CHAR(2),
    [requiredBy] DATETIME2,
    [quotedAt] DATETIME2,
    [totalValue] DECIMAL(18,2),
    [quoteNotes] NVARCHAR(1000),
    [declineReason] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tender_call_off_quotes_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_call_off_quotes_pkey] PRIMARY KEY CLUSTERED ([id])
);
CREATE NONCLUSTERED INDEX [tender_call_off_quotes_competitionId_idx] ON [dbo].[tender_call_off_quotes]([competitionId]);
CREATE NONCLUSTERED INDEX [tender_call_off_quotes_awardedOrganizationId_idx] ON [dbo].[tender_call_off_quotes]([awardedOrganizationId]);

CREATE TABLE [dbo].[tender_call_off_quote_lines] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [awardedOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [quoteId] NVARCHAR(1000) NOT NULL,
    [tenderLineId] NVARCHAR(1000) NOT NULL,
    [quantity] DECIMAL(18,3) NOT NULL,
    [frameworkPrice] DECIMAL(18,4) NOT NULL,
    [quotedPrice] DECIMAL(18,4),
    [leadTimeDays] INT,
    CONSTRAINT [tender_call_off_quote_lines_pkey] PRIMARY KEY CLUSTERED ([id])
);
CREATE NONCLUSTERED INDEX [tender_call_off_quote_lines_quoteId_idx] ON [dbo].[tender_call_off_quote_lines]([quoteId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
