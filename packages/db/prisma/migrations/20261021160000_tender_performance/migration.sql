BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[tender_performance_records] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [awardedOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [contractId] NVARCHAR(1000) NOT NULL,
    [outcome] NVARCHAR(20) NOT NULL,
    [closedAt] DATETIME2 NOT NULL,
    [measuresJson] NVARCHAR(max) NOT NULL,
    [overallScore] INT,
    [band] NVARCHAR(30) NOT NULL,
    [coverage] INT NOT NULL CONSTRAINT [tender_performance_records_coverage_df] DEFAULT 0,
    [milestonesTotal] INT NOT NULL CONSTRAINT [tender_performance_records_milestonesTotal_df] DEFAULT 0,
    [milestonesOnTime] INT NOT NULL CONSTRAINT [tender_performance_records_milestonesOnTime_df] DEFAULT 0,
    [onTimePercent] INT,
    [inFullPercent] INT,
    [otifPercent] INT,
    [feedbackJson] NVARCHAR(max),
    [feedbackAverage] DECIMAL(4,2),
    [replyDeadline] DATETIME2 NOT NULL,
    [withdrawnAt] DATETIME2,
    [withdrawnReason] NVARCHAR(1000),
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tender_performance_records_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_performance_records_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_performance_records_contractId_key] UNIQUE NONCLUSTERED ([contractId])
);

CREATE NONCLUSTERED INDEX [tender_performance_records_tenderId_idx] ON [dbo].[tender_performance_records]([tenderId]);
CREATE NONCLUSTERED INDEX [tender_performance_records_awardedOrganizationId_idx] ON [dbo].[tender_performance_records]([awardedOrganizationId]);
CREATE NONCLUSTERED INDEX [tender_performance_records_organizationId_idx] ON [dbo].[tender_performance_records]([organizationId]);

-- CreateTable
CREATE TABLE [dbo].[tender_performance_responses] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [awardedOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [recordId] NVARCHAR(1000) NOT NULL,
    [kind] NVARCHAR(20) NOT NULL,
    [measureKey] NVARCHAR(50),
    [body] NVARCHAR(2000) NOT NULL,
    [byOrganizationId] NVARCHAR(1000) NOT NULL,
    [byUserId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tender_performance_responses_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_performance_responses_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [tender_performance_responses_recordId_idx] ON [dbo].[tender_performance_responses]([recordId]);

-- CreateTable
CREATE TABLE [dbo].[tender_contract_payments] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [awardedOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [contractId] NVARCHAR(1000) NOT NULL,
    [reference] NVARCHAR(100) NOT NULL,
    [description] NVARCHAR(300),
    [amount] DECIMAL(18,2) NOT NULL,
    [currency] CHAR(3),
    [invoiceDate] DATETIME2,
    [dueDate] DATETIME2 NOT NULL,
    [paidDate] DATETIME2,
    [recordedByOrganizationId] NVARCHAR(1000) NOT NULL,
    [recordedById] NVARCHAR(1000),
    [recordedAt] DATETIME2 NOT NULL CONSTRAINT [tender_contract_payments_recordedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [tender_contract_payments_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [tender_contract_payments_contractId_idx] ON [dbo].[tender_contract_payments]([contractId]);
CREATE NONCLUSTERED INDEX [tender_contract_payments_organizationId_idx] ON [dbo].[tender_contract_payments]([organizationId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
