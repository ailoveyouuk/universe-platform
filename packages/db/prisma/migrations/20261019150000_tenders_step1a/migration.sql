BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[tenders] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [referenceNumber] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(300) NOT NULL,
    [summary] NVARCHAR(max),
    [tenderType] NVARCHAR(1000) NOT NULL CONSTRAINT [tenders_tenderType_df] DEFAULT 'RFQ',
    [visibility] NVARCHAR(1000) NOT NULL CONSTRAINT [tenders_visibility_df] DEFAULT 'ELIGIBLE_ORGANISATIONS',
    [isPublished] BIT NOT NULL CONSTRAINT [tenders_isPublished_df] DEFAULT 0,
    [visibleToAll] BIT NOT NULL CONSTRAINT [tenders_visibleToAll_df] DEFAULT 1,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [tenders_status_df] DEFAULT 'DRAFT',
    [deliveryCountryCodes] NVARCHAR(1000),
    [currency] CHAR(3),
    [incoterm] NVARCHAR(1000),
    [clientName] NVARCHAR(1000),
    [publishedAt] DATETIME2,
    [clarificationDeadline] DATETIME2,
    [closingAt] DATETIME2,
    [evaluationDueAt] DATETIME2,
    [awardDueAt] DATETIME2,
    [bidValidityDays] INT,
    [contractStartDate] DATETIME2,
    [acceptedFileTypes] NVARCHAR(1000) CONSTRAINT [tenders_acceptedFileTypes_df] DEFAULT 'pdf,docx,xlsx,csv',
    [maxFileSizeMb] INT CONSTRAINT [tenders_maxFileSizeMb_df] DEFAULT 25,
    [allowTextSubmission] BIT NOT NULL CONSTRAINT [tenders_allowTextSubmission_df] DEFAULT 1,
    [publicTeaser] BIT NOT NULL CONSTRAINT [tenders_publicTeaser_df] DEFAULT 0,
    [termsAndConditions] NVARCHAR(max),
    [cancelledReason] NVARCHAR(1000),
    [isSimulated] BIT NOT NULL CONSTRAINT [tenders_isSimulated_df] DEFAULT 0,
    [archivedAt] DATETIME2,
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tenders_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [tenders_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tenders_organizationId_referenceNumber_key] UNIQUE NONCLUSTERED ([organizationId],[referenceNumber])
);

-- CreateTable
CREATE TABLE [dbo].[tender_lines] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [lotNumber] INT,
    [lotTitle] NVARCHAR(1000),
    [lineNumber] INT NOT NULL,
    [productMasterId] NVARCHAR(1000),
    [description] NVARCHAR(500) NOT NULL,
    [specification] NVARCHAR(max),
    [quantity] DECIMAL(18,3),
    [unit] NVARCHAR(1000),
    [destinationCountryCode] CHAR(2),
    [requiredRegistration] NVARCHAR(1000),
    [minShelfLifePercent] INT,
    [coldChainRequired] BIT NOT NULL CONSTRAINT [tender_lines_coldChainRequired_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tender_lines_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [tender_lines_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_lines_tenderId_lineNumber_key] UNIQUE NONCLUSTERED ([tenderId],[lineNumber])
);

-- CreateTable
CREATE TABLE [dbo].[tender_criteria] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [sortOrder] INT NOT NULL CONSTRAINT [tender_criteria_sortOrder_df] DEFAULT 0,
    [title] NVARCHAR(300) NOT NULL,
    [description] NVARCHAR(max),
    [kind] NVARCHAR(1000) NOT NULL CONSTRAINT [tender_criteria_kind_df] DEFAULT 'SCORED',
    [weight] DECIMAL(5,2),
    [isMandatory] BIT NOT NULL CONSTRAINT [tender_criteria_isMandatory_df] DEFAULT 1,
    [responseFormat] NVARCHAR(1000) NOT NULL CONSTRAINT [tender_criteria_responseFormat_df] DEFAULT 'EITHER',
    [acceptedFileTypes] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tender_criteria_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [tender_criteria_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[tender_eligibility_rules] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [ruleType] NVARCHAR(1000) NOT NULL,
    [ruleValue] NVARCHAR(500) NOT NULL,
    [explanation] NVARCHAR(500),
    [isRequired] BIT NOT NULL CONSTRAINT [tender_eligibility_rules_isRequired_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tender_eligibility_rules_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_eligibility_rules_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[tender_invitations] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [invitedOrganizationId] NVARCHAR(1000) NOT NULL,
    [invitedAt] DATETIME2 NOT NULL CONSTRAINT [tender_invitations_invitedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [invitedById] NVARCHAR(1000),
    CONSTRAINT [tender_invitations_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_invitations_tenderId_invitedOrganizationId_key] UNIQUE NONCLUSTERED ([tenderId],[invitedOrganizationId])
);

-- CreateTable
CREATE TABLE [dbo].[tender_documents] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(300) NOT NULL,
    [docType] NVARCHAR(1000) NOT NULL CONSTRAINT [tender_documents_docType_df] DEFAULT 'SPECIFICATION',
    [blobName] NVARCHAR(1000),
    [fileName] NVARCHAR(1000),
    [fileSizeBytes] INT,
    [mimeType] NVARCHAR(1000),
    [uploadedById] NVARCHAR(1000),
    [uploadedAt] DATETIME2 NOT NULL CONSTRAINT [tender_documents_uploadedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [archivedAt] DATETIME2,
    CONSTRAINT [tender_documents_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[tender_clarifications] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [question] NVARCHAR(max) NOT NULL,
    [answer] NVARCHAR(max) NOT NULL,
    [sourceQuestionId] NVARCHAR(1000),
    [answeredById] NVARCHAR(1000),
    [answeredAt] DATETIME2 NOT NULL CONSTRAINT [tender_clarifications_answeredAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_clarifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[tender_questions] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [issuerOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [question] NVARCHAR(max) NOT NULL,
    [askedById] NVARCHAR(1000),
    [askedAt] DATETIME2 NOT NULL CONSTRAINT [tender_questions_askedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_questions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[tender_participations] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [issuerOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [tender_participations_status_df] DEFAULT 'INTERESTED',
    [optedInAt] DATETIME2 NOT NULL CONSTRAINT [tender_participations_optedInAt_df] DEFAULT CURRENT_TIMESTAMP,
    [optedInById] NVARCHAR(1000),
    [withdrawnAt] DATETIME2,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [tender_participations_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_participations_tenderId_organizationId_key] UNIQUE NONCLUSTERED ([tenderId],[organizationId])
);

-- CreateTable
CREATE TABLE [dbo].[tender_eligibility_checks] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [issuerOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [outcome] NVARCHAR(1000) NOT NULL,
    [detailsJson] NVARCHAR(max) NOT NULL,
    [checkedAt] DATETIME2 NOT NULL CONSTRAINT [tender_eligibility_checks_checkedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_eligibility_checks_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[tender_shortlists] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [note] NVARCHAR(500),
    [addedById] NVARCHAR(1000),
    [addedAt] DATETIME2 NOT NULL CONSTRAINT [tender_shortlists_addedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_shortlists_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_shortlists_organizationId_tenderId_key] UNIQUE NONCLUSTERED ([organizationId],[tenderId])
);

-- CreateTable
CREATE TABLE [dbo].[tender_saved_searches] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [criteriaJson] NVARCHAR(max) NOT NULL,
    [alertsEnabled] BIT NOT NULL CONSTRAINT [tender_saved_searches_alertsEnabled_df] DEFAULT 1,
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tender_saved_searches_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_saved_searches_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[tender_events] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [counterpartyOrganizationId] NVARCHAR(1000),
    [tenderId] NVARCHAR(1000) NOT NULL,
    [actorOrganizationId] NVARCHAR(1000) NOT NULL,
    [actorUserId] NVARCHAR(1000),
    [kind] NVARCHAR(1000) NOT NULL,
    [summary] NVARCHAR(500) NOT NULL,
    [detailsJson] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tender_events_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_events_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tenders_organizationId_status_idx] ON [dbo].[tenders]([organizationId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tenders_isPublished_status_closingAt_idx] ON [dbo].[tenders]([isPublished], [status], [closingAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_lines_organizationId_idx] ON [dbo].[tender_lines]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_lines_productMasterId_idx] ON [dbo].[tender_lines]([productMasterId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_criteria_tenderId_sortOrder_idx] ON [dbo].[tender_criteria]([tenderId], [sortOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_criteria_organizationId_idx] ON [dbo].[tender_criteria]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_eligibility_rules_tenderId_idx] ON [dbo].[tender_eligibility_rules]([tenderId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_eligibility_rules_organizationId_idx] ON [dbo].[tender_eligibility_rules]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_invitations_invitedOrganizationId_idx] ON [dbo].[tender_invitations]([invitedOrganizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_invitations_organizationId_idx] ON [dbo].[tender_invitations]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_documents_tenderId_idx] ON [dbo].[tender_documents]([tenderId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_documents_organizationId_idx] ON [dbo].[tender_documents]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_clarifications_tenderId_answeredAt_idx] ON [dbo].[tender_clarifications]([tenderId], [answeredAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_clarifications_organizationId_idx] ON [dbo].[tender_clarifications]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_questions_tenderId_idx] ON [dbo].[tender_questions]([tenderId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_questions_organizationId_idx] ON [dbo].[tender_questions]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_questions_issuerOrganizationId_idx] ON [dbo].[tender_questions]([issuerOrganizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_participations_issuerOrganizationId_tenderId_idx] ON [dbo].[tender_participations]([issuerOrganizationId], [tenderId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_eligibility_checks_tenderId_organizationId_checkedAt_idx] ON [dbo].[tender_eligibility_checks]([tenderId], [organizationId], [checkedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_eligibility_checks_issuerOrganizationId_idx] ON [dbo].[tender_eligibility_checks]([issuerOrganizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_saved_searches_organizationId_idx] ON [dbo].[tender_saved_searches]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_events_tenderId_createdAt_idx] ON [dbo].[tender_events]([tenderId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_events_organizationId_idx] ON [dbo].[tender_events]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_events_counterpartyOrganizationId_idx] ON [dbo].[tender_events]([counterpartyOrganizationId]);

-- AddForeignKey
ALTER TABLE [dbo].[tenders] ADD CONSTRAINT [tenders_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tender_lines] ADD CONSTRAINT [tender_lines_tenderId_fkey] FOREIGN KEY ([tenderId]) REFERENCES [dbo].[tenders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tender_criteria] ADD CONSTRAINT [tender_criteria_tenderId_fkey] FOREIGN KEY ([tenderId]) REFERENCES [dbo].[tenders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tender_eligibility_rules] ADD CONSTRAINT [tender_eligibility_rules_tenderId_fkey] FOREIGN KEY ([tenderId]) REFERENCES [dbo].[tenders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tender_invitations] ADD CONSTRAINT [tender_invitations_tenderId_fkey] FOREIGN KEY ([tenderId]) REFERENCES [dbo].[tenders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tender_documents] ADD CONSTRAINT [tender_documents_tenderId_fkey] FOREIGN KEY ([tenderId]) REFERENCES [dbo].[tenders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[tender_clarifications] ADD CONSTRAINT [tender_clarifications_tenderId_fkey] FOREIGN KEY ([tenderId]) REFERENCES [dbo].[tenders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

