BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[crm_gift_policies] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [currency] CHAR(3) NOT NULL CONSTRAINT [crm_gift_policies_currency_df] DEFAULT 'GBP',
    [giftThreshold] DECIMAL(18,2) NOT NULL CONSTRAINT [crm_gift_policies_giftThreshold_df] DEFAULT 50,
    [hospitalityThreshold] DECIMAL(18,2) NOT NULL CONSTRAINT [crm_gift_policies_hospitalityThreshold_df] DEFAULT 150,
    [annualThreshold] DECIMAL(18,2) NOT NULL CONSTRAINT [crm_gift_policies_annualThreshold_df] DEFAULT 300,
    [alwaysApprovePublicOfficial] BIT NOT NULL CONSTRAINT [crm_gift_policies_alwaysApprovePublicOfficial_df] DEFAULT 1,
    [approverUserIds] NVARCHAR(2000),
    [policyDocumentId] NVARCHAR(1000),
    [policyTitle] NVARCHAR(200),
    [policyVersion] NVARCHAR(50),
    [policyEffectiveFrom] DATE,
    [policyReviewDue] DATE,
    [confirmedAt] DATETIME2,
    [updatedById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [crm_gift_policies_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [crm_gift_policies_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [crm_gift_policies_organizationId_key] UNIQUE NONCLUSTERED ([organizationId])
);

CREATE TABLE [dbo].[crm_hospitality_records] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [relationshipId] NVARCHAR(1000) NOT NULL,
    [direction] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [occurredOn] DATE NOT NULL,
    [description] NVARCHAR(500) NOT NULL,
    [businessReason] NVARCHAR(500) NOT NULL,
    [amount] DECIMAL(18,2) NOT NULL CONSTRAINT [crm_hospitality_records_amount_df] DEFAULT 0,
    [currency] CHAR(3) NOT NULL,
    [valueInPolicyCurrency] DECIMAL(18,2),
    [policyCurrency] CHAR(3) NOT NULL,
    [contactId] NVARCHAR(1000),
    [personName] NVARCHAR(150),
    [publicOfficial] BIT NOT NULL CONSTRAINT [crm_hospitality_records_publicOfficial_df] DEFAULT 0,
    [linkedType] NVARCHAR(1000),
    [linkedId] NVARCHAR(1000),
    [linkedLabel] NVARCHAR(300),
    [status] NVARCHAR(1000) NOT NULL,
    [approvalReasons] NVARCHAR(1000),
    [decidedById] NVARCHAR(1000),
    [decidedAt] DATETIME2,
    [decisionNote] NVARCHAR(500),
    [evidenceDocumentId] NVARCHAR(1000),
    [additionalInfo] NVARCHAR(2000),
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [crm_hospitality_records_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [archivedAt] DATETIME2,
    [archivedById] NVARCHAR(1000),
    CONSTRAINT [crm_hospitality_records_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [crm_hospitality_records_organizationId_relationshipId_occurredOn_idx] ON [dbo].[crm_hospitality_records]([organizationId], [relationshipId], [occurredOn]);
CREATE NONCLUSTERED INDEX [crm_hospitality_records_organizationId_status_idx] ON [dbo].[crm_hospitality_records]([organizationId], [status]);
CREATE NONCLUSTERED INDEX [crm_hospitality_records_organizationId_occurredOn_idx] ON [dbo].[crm_hospitality_records]([organizationId], [occurredOn]);

ALTER TABLE [dbo].[crm_hospitality_records] ADD CONSTRAINT [crm_hospitality_records_relationshipId_fkey] FOREIGN KEY ([relationshipId]) REFERENCES [dbo].[crm_relationships]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
