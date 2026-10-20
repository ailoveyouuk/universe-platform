BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[tenders] ADD
    [emergencyProcurement] BIT NOT NULL CONSTRAINT [tenders_emergencyProcurement_df] DEFAULT 0,
    [emergencyReason] NVARCHAR(1000),
    [allowSingleEvaluator] BIT NOT NULL CONSTRAINT [tenders_allowSingleEvaluator_df] DEFAULT 0,
    [singleEvaluatorReason] NVARCHAR(1000),
    [bidsOpenedAt] DATETIME2,
    [evaluationStartedAt] DATETIME2,
    [scoringFinalisedAt] DATETIME2,
    [awardedAt] DATETIME2,
    [standstillEndsAt] DATETIME2;

-- AlterTable
ALTER TABLE [dbo].[tender_criteria] ADD [metric] NVARCHAR(1000) NOT NULL CONSTRAINT [tender_criteria_metric_df] DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE [dbo].[tender_evaluators] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [tender_evaluators_role_df] DEFAULT 'EVALUATOR',
    [coiDeclaredAt] DATETIME2,
    [coiNoConflict] BIT,
    [coiBidderIds] NVARCHAR(max),
    [coiNotes] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tender_evaluators_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_evaluators_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_evaluators_tenderId_userId_key] UNIQUE NONCLUSTERED ([tenderId],[userId])
);

CREATE NONCLUSTERED INDEX [tender_evaluators_organizationId_idx] ON [dbo].[tender_evaluators]([organizationId]);

-- CreateTable
CREATE TABLE [dbo].[tender_bid_gates] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [bidId] NVARCHAR(1000) NOT NULL,
    [criterionId] NVARCHAR(1000) NOT NULL,
    [passed] BIT NOT NULL,
    [notes] NVARCHAR(max),
    [recordedById] NVARCHAR(1000),
    [recordedAt] DATETIME2 NOT NULL CONSTRAINT [tender_bid_gates_recordedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_bid_gates_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_bid_gates_bidId_criterionId_key] UNIQUE NONCLUSTERED ([bidId],[criterionId])
);

CREATE NONCLUSTERED INDEX [tender_bid_gates_tenderId_idx] ON [dbo].[tender_bid_gates]([tenderId]);

-- CreateTable
CREATE TABLE [dbo].[tender_bid_scores] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [bidId] NVARCHAR(1000) NOT NULL,
    [criterionId] NVARCHAR(1000) NOT NULL,
    [evaluatorUserId] NVARCHAR(1000) NOT NULL,
    [score] DECIMAL(5,2) NOT NULL,
    [rationale] NVARCHAR(max),
    [submittedAt] DATETIME2,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [tender_bid_scores_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_bid_scores_bidId_criterionId_evaluatorUserId_key] UNIQUE NONCLUSTERED ([bidId],[criterionId],[evaluatorUserId])
);

CREATE NONCLUSTERED INDEX [tender_bid_scores_tenderId_idx] ON [dbo].[tender_bid_scores]([tenderId]);

-- CreateTable
CREATE TABLE [dbo].[tender_moderated_scores] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [bidId] NVARCHAR(1000) NOT NULL,
    [criterionId] NVARCHAR(1000) NOT NULL,
    [score] DECIMAL(5,2) NOT NULL,
    [rationale] NVARCHAR(max),
    [isCalculated] BIT NOT NULL CONSTRAINT [tender_moderated_scores_isCalculated_df] DEFAULT 0,
    [recordedById] NVARCHAR(1000),
    [recordedAt] DATETIME2 NOT NULL CONSTRAINT [tender_moderated_scores_recordedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_moderated_scores_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_moderated_scores_bidId_criterionId_key] UNIQUE NONCLUSTERED ([bidId],[criterionId])
);

CREATE NONCLUSTERED INDEX [tender_moderated_scores_tenderId_idx] ON [dbo].[tender_moderated_scores]([tenderId]);

-- CreateTable
CREATE TABLE [dbo].[tender_awards] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [bidId] NVARCHAR(1000) NOT NULL,
    [awardedOrganizationId] NVARCHAR(1000) NOT NULL,
    [reason] NVARCHAR(max) NOT NULL,
    [awardedAt] DATETIME2 NOT NULL CONSTRAINT [tender_awards_awardedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [awardedById] NVARCHAR(1000),
    CONSTRAINT [tender_awards_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_awards_tenderId_bidId_key] UNIQUE NONCLUSTERED ([tenderId],[bidId])
);

CREATE NONCLUSTERED INDEX [tender_awards_tenderId_idx] ON [dbo].[tender_awards]([tenderId]);
CREATE NONCLUSTERED INDEX [tender_awards_awardedOrganizationId_idx] ON [dbo].[tender_awards]([awardedOrganizationId]);

-- CreateTable
CREATE TABLE [dbo].[tender_award_lines] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [awardedOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [awardId] NVARCHAR(1000) NOT NULL,
    [tenderLineId] NVARCHAR(1000) NOT NULL,
    [sharePercent] DECIMAL(5,2) NOT NULL,
    CONSTRAINT [tender_award_lines_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_award_lines_awardId_tenderLineId_key] UNIQUE NONCLUSTERED ([awardId],[tenderLineId])
);

CREATE NONCLUSTERED INDEX [tender_award_lines_tenderId_idx] ON [dbo].[tender_award_lines]([tenderId]);

-- CreateTable
CREATE TABLE [dbo].[tender_debriefs] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [bidId] NVARCHAR(1000) NOT NULL,
    [bidderOrganizationId] NVARCHAR(1000) NOT NULL,
    [outcome] NVARCHAR(1000) NOT NULL,
    [totalScore] DECIMAL(6,2),
    [rank] INT,
    [bidCount] INT,
    [scoresJson] NVARCHAR(max) NOT NULL,
    [feedback] NVARCHAR(max),
    [releasedAt] DATETIME2 NOT NULL CONSTRAINT [tender_debriefs_releasedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_debriefs_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_debriefs_tenderId_bidId_key] UNIQUE NONCLUSTERED ([tenderId],[bidId])
);

CREATE NONCLUSTERED INDEX [tender_debriefs_bidderOrganizationId_idx] ON [dbo].[tender_debriefs]([bidderOrganizationId]);

-- CreateTable
CREATE TABLE [dbo].[tender_complaints] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [issuerOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [body] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [tender_complaints_status_df] DEFAULT 'OPEN',
    [response] NVARCHAR(max),
    [lodgedById] NVARCHAR(1000),
    [lodgedAt] DATETIME2 NOT NULL CONSTRAINT [tender_complaints_lodgedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [respondedAt] DATETIME2,
    CONSTRAINT [tender_complaints_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [tender_complaints_tenderId_idx] ON [dbo].[tender_complaints]([tenderId]);
CREATE NONCLUSTERED INDEX [tender_complaints_issuerOrganizationId_idx] ON [dbo].[tender_complaints]([issuerOrganizationId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
