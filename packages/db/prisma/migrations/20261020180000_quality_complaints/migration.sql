BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[quality_complaints] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [referenceNumber] NVARCHAR(1000) NOT NULL,
    [direction] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [quality_complaints_status_df] DEFAULT 'LOGGED',
    [heldFromStatus] NVARCHAR(1000),
    [holdReason] NVARCHAR(1000),
    [title] NVARCHAR(300) NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [receivedAt] DATETIME2 NOT NULL,
    [channel] NVARCHAR(1000),
    [severity] NVARCHAR(1000),
    [category] NVARCHAR(1000),
    [isSerious] BIT NOT NULL CONSTRAINT [quality_complaints_isSerious_df] DEFAULT 0,
    [flagPatientSafety] BIT NOT NULL CONSTRAINT [quality_complaints_flagPatientSafety_df] DEFAULT 0,
    [flagSuspectedFalsified] BIT NOT NULL CONSTRAINT [quality_complaints_flagSuspectedFalsified_df] DEFAULT 0,
    [flagTemperatureExcursion] BIT NOT NULL CONSTRAINT [quality_complaints_flagTemperatureExcursion_df] DEFAULT 0,
    [partnerId] NVARCHAR(1000),
    [contactId] NVARCHAR(1000),
    [complainantName] NVARCHAR(300),
    [complainantEmail] NVARCHAR(300),
    [complainantPhone] NVARCHAR(100),
    [projectId] NVARCHAR(1000),
    [projectLineId] NVARCHAR(1000),
    [productBatchId] NVARCHAR(1000),
    [productMasterId] NVARCHAR(1000),
    [ownerId] NVARCHAR(1000),
    [investigatorId] NVARCHAR(1000),
    [loggedById] NVARCHAR(1000),
    [acknowledgeDueAt] DATETIME2,
    [acknowledgedAt] DATETIME2,
    [triageDueAt] DATETIME2,
    [triagedAt] DATETIME2,
    [resolveDueAt] DATETIME2,
    [investigationStartedAt] DATETIME2,
    [investigationCompletedAt] DATETIME2,
    [resolvedAt] DATETIME2,
    [closedAt] DATETIME2,
    [investigationScope] NVARCHAR(max),
    [rootCauseCategory] NVARCHAR(1000),
    [rootCause] NVARCHAR(max),
    [findings] NVARCHAR(max),
    [impactSummary] NVARCHAR(max),
    [outcome] NVARCHAR(1000),
    [partnerResponseDueAt] DATETIME2,
    [partnerRespondedAt] DATETIME2,
    [partnerResponse] NVARCHAR(max),
    [remedyType] NVARCHAR(1000),
    [remedyNotes] NVARCHAR(max),
    [responseSentAt] DATETIME2,
    [responseSummary] NVARCHAR(max),
    [complainantReaction] NVARCHAR(1000),
    [regulatorDecision] NVARCHAR(1000),
    [regulatorDecisionReason] NVARCHAR(1000),
    [regulatorReference] NVARCHAR(200),
    [regulatorDecisionById] NVARCHAR(1000),
    [regulatorDecisionAt] DATETIME2,
    [closureSummary] NVARCHAR(max),
    [lessonsLearned] NVARCHAR(max),
    [effectivenessCheckDueAt] DATETIME2,
    [effectivenessCheckedAt] DATETIME2,
    [effectivenessNotes] NVARCHAR(max),
    [closedById] NVARCHAR(1000),
    [closureOverrideReason] NVARCHAR(1000),
    [reopenCount] INT NOT NULL CONSTRAINT [quality_complaints_reopenCount_df] DEFAULT 0,
    [archivedAt] DATETIME2,
    [archivedById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [quality_complaints_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [quality_complaints_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [quality_complaints_organizationId_referenceNumber_key] UNIQUE NONCLUSTERED ([organizationId],[referenceNumber])
);

-- CreateTable
CREATE TABLE [dbo].[quality_complaint_events] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [complaintId] NVARCHAR(1000) NOT NULL,
    [kind] NVARCHAR(1000) NOT NULL,
    [summary] NVARCHAR(500) NOT NULL,
    [body] NVARCHAR(max),
    [actorUserId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [quality_complaint_events_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [quality_complaint_events_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[quality_complaint_actions] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [complaintId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [ownerId] NVARCHAR(1000) NOT NULL,
    [dueDate] DATETIME2 NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [quality_complaint_actions_status_df] DEFAULT 'OPEN',
    [completedAt] DATETIME2,
    [completionNotes] NVARCHAR(max),
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [quality_complaint_actions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [quality_complaint_actions_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [quality_complaints_organizationId_status_idx] ON [dbo].[quality_complaints]([organizationId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [quality_complaints_organizationId_direction_status_idx] ON [dbo].[quality_complaints]([organizationId], [direction], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [quality_complaints_partnerId_idx] ON [dbo].[quality_complaints]([partnerId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [quality_complaints_projectId_idx] ON [dbo].[quality_complaints]([projectId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [quality_complaints_productBatchId_idx] ON [dbo].[quality_complaints]([productBatchId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [quality_complaints_productMasterId_idx] ON [dbo].[quality_complaints]([productMasterId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [quality_complaint_events_complaintId_createdAt_idx] ON [dbo].[quality_complaint_events]([complaintId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [quality_complaint_events_organizationId_idx] ON [dbo].[quality_complaint_events]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [quality_complaint_actions_complaintId_idx] ON [dbo].[quality_complaint_actions]([complaintId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [quality_complaint_actions_organizationId_status_dueDate_idx] ON [dbo].[quality_complaint_actions]([organizationId], [status], [dueDate]);

-- AddForeignKey
ALTER TABLE [dbo].[quality_complaints] ADD CONSTRAINT [quality_complaints_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quality_complaints] ADD CONSTRAINT [quality_complaints_partnerId_fkey] FOREIGN KEY ([partnerId]) REFERENCES [dbo].[partners]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quality_complaints] ADD CONSTRAINT [quality_complaints_contactId_fkey] FOREIGN KEY ([contactId]) REFERENCES [dbo].[contacts]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quality_complaints] ADD CONSTRAINT [quality_complaints_projectId_fkey] FOREIGN KEY ([projectId]) REFERENCES [dbo].[projects]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quality_complaints] ADD CONSTRAINT [quality_complaints_projectLineId_fkey] FOREIGN KEY ([projectLineId]) REFERENCES [dbo].[project_lines]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quality_complaints] ADD CONSTRAINT [quality_complaints_productBatchId_fkey] FOREIGN KEY ([productBatchId]) REFERENCES [dbo].[product_batches]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quality_complaints] ADD CONSTRAINT [quality_complaints_productMasterId_fkey] FOREIGN KEY ([productMasterId]) REFERENCES [dbo].[product_master]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quality_complaint_events] ADD CONSTRAINT [quality_complaint_events_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quality_complaint_events] ADD CONSTRAINT [quality_complaint_events_complaintId_fkey] FOREIGN KEY ([complaintId]) REFERENCES [dbo].[quality_complaints]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quality_complaint_actions] ADD CONSTRAINT [quality_complaint_actions_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[quality_complaint_actions] ADD CONSTRAINT [quality_complaint_actions_complaintId_fkey] FOREIGN KEY ([complaintId]) REFERENCES [dbo].[quality_complaints]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

