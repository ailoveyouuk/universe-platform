BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[tender_bids] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [issuerOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [tender_bids_status_df] DEFAULT 'DRAFT',
    [bidCurrency] CHAR(3),
    [validityConfirmed] BIT NOT NULL CONSTRAINT [tender_bids_validityConfirmed_df] DEFAULT 0,
    [validityDays] INT,
    [notes] NVARCHAR(max),
    [fxRate] DECIMAL(18,8),
    [fxRateDate] DATETIME2,
    [totalBidCurrency] DECIMAL(18,2),
    [totalTenderCurrency] DECIMAL(18,2),
    [submittedAt] DATETIME2,
    [withdrawnAt] DATETIME2,
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tender_bids_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [tender_bids_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_bids_tenderId_organizationId_key] UNIQUE NONCLUSTERED ([tenderId],[organizationId])
);

-- CreateTable
CREATE TABLE [dbo].[tender_bid_lines] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [issuerOrganizationId] NVARCHAR(1000) NOT NULL,
    [bidId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [tenderLineId] NVARCHAR(1000) NOT NULL,
    [noBid] BIT NOT NULL CONSTRAINT [tender_bid_lines_noBid_df] DEFAULT 0,
    [unitPrice] DECIMAL(18,4),
    [leadTimeDays] INT,
    [countryOfOrigin] CHAR(2),
    [manufacturerName] NVARCHAR(300),
    [remarks] NVARCHAR(1000),
    CONSTRAINT [tender_bid_lines_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_bid_lines_bidId_tenderLineId_key] UNIQUE NONCLUSTERED ([bidId],[tenderLineId])
);

-- CreateTable
CREATE TABLE [dbo].[tender_bid_responses] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [issuerOrganizationId] NVARCHAR(1000) NOT NULL,
    [bidId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [criterionId] NVARCHAR(1000) NOT NULL,
    [text] NVARCHAR(max),
    CONSTRAINT [tender_bid_responses_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_bid_responses_bidId_criterionId_key] UNIQUE NONCLUSTERED ([bidId],[criterionId])
);

-- CreateTable
CREATE TABLE [dbo].[tender_bid_files] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [issuerOrganizationId] NVARCHAR(1000) NOT NULL,
    [bidId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [criterionId] NVARCHAR(1000),
    [fileName] NVARCHAR(300) NOT NULL,
    [blobName] NVARCHAR(500) NOT NULL,
    [mimeType] NVARCHAR(1000),
    [fileSizeBytes] INT,
    [uploadedById] NVARCHAR(1000),
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [tender_bid_files_uploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_bid_files_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_bids_issuerOrganizationId_tenderId_idx] ON [dbo].[tender_bids]([issuerOrganizationId], [tenderId]);
CREATE NONCLUSTERED INDEX [tender_bid_lines_issuerOrganizationId_tenderId_idx] ON [dbo].[tender_bid_lines]([issuerOrganizationId], [tenderId]);
CREATE NONCLUSTERED INDEX [tender_bid_responses_issuerOrganizationId_tenderId_idx] ON [dbo].[tender_bid_responses]([issuerOrganizationId], [tenderId]);
CREATE NONCLUSTERED INDEX [tender_bid_files_bidId_idx] ON [dbo].[tender_bid_files]([bidId]);
CREATE NONCLUSTERED INDEX [tender_bid_files_issuerOrganizationId_tenderId_idx] ON [dbo].[tender_bid_files]([issuerOrganizationId], [tenderId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
