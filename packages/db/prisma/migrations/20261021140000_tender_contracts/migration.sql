BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[tender_contracts] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [awardedOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [awardId] NVARCHAR(1000) NOT NULL,
    [reference] NVARCHAR(100) NOT NULL,
    [title] NVARCHAR(300) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [tender_contracts_status_df] DEFAULT 'DRAFT',
    [currency] CHAR(3),
    [totalValue] DECIMAL(18,2),
    [startDate] DATETIME2,
    [endDate] DATETIME2,
    [terms] NVARCHAR(max),
    [sentAt] DATETIME2,
    [executedAt] DATETIME2,
    [closedAt] DATETIME2,
    [closeNote] NVARCHAR(2000),
    [supplierProjectId] NVARCHAR(1000),
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tender_contracts_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [tender_contracts_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_contracts_awardId_key] UNIQUE NONCLUSTERED ([awardId])
);

CREATE NONCLUSTERED INDEX [tender_contracts_tenderId_idx] ON [dbo].[tender_contracts]([tenderId]);
CREATE NONCLUSTERED INDEX [tender_contracts_awardedOrganizationId_idx] ON [dbo].[tender_contracts]([awardedOrganizationId]);
CREATE NONCLUSTERED INDEX [tender_contracts_organizationId_idx] ON [dbo].[tender_contracts]([organizationId]);

-- CreateTable
CREATE TABLE [dbo].[tender_contract_milestones] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [awardedOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [contractId] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(300) NOT NULL,
    [dueDate] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [tender_contract_milestones_status_df] DEFAULT 'PENDING',
    [completedAt] DATETIME2,
    [notes] NVARCHAR(1000),
    [sortOrder] INT NOT NULL CONSTRAINT [tender_contract_milestones_sortOrder_df] DEFAULT 0,
    CONSTRAINT [tender_contract_milestones_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [tender_contract_milestones_contractId_idx] ON [dbo].[tender_contract_milestones]([contractId]);

-- CreateTable
CREATE TABLE [dbo].[tender_contract_files] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [awardedOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [contractId] NVARCHAR(1000) NOT NULL,
    [kind] NVARCHAR(1000) NOT NULL,
    [version] INT NOT NULL CONSTRAINT [tender_contract_files_version_df] DEFAULT 1,
    [title] NVARCHAR(300) NOT NULL,
    [fileName] NVARCHAR(300) NOT NULL,
    [blobName] NVARCHAR(500) NOT NULL,
    [mimeType] NVARCHAR(1000),
    [fileSizeBytes] INT,
    [uploadedByOrganizationId] NVARCHAR(1000) NOT NULL,
    [uploadedById] NVARCHAR(1000),
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [tender_contract_files_uploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [note] NVARCHAR(1000),
    CONSTRAINT [tender_contract_files_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [tender_contract_files_contractId_idx] ON [dbo].[tender_contract_files]([contractId]);

-- CreateTable
CREATE TABLE [dbo].[tender_contract_signatories] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [awardedOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [contractId] NVARCHAR(1000) NOT NULL,
    [party] NVARCHAR(1000) NOT NULL,
    [signerName] NVARCHAR(200) NOT NULL,
    [signerRole] NVARCHAR(200),
    [signedOn] DATETIME2 NOT NULL,
    [recordedByOrganizationId] NVARCHAR(1000) NOT NULL,
    [recordedById] NVARCHAR(1000),
    [recordedAt] DATETIME2 NOT NULL CONSTRAINT [tender_contract_signatories_recordedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_contract_signatories_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [tender_contract_signatories_contractId_idx] ON [dbo].[tender_contract_signatories]([contractId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
