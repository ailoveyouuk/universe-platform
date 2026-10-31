BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[tender_mini_evaluators] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [competitionId] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [coiDeclaredAt] DATETIME2,
    [coiNoConflict] BIT,
    [coiNotes] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tender_mini_evaluators_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_mini_evaluators_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_mini_evaluators_competitionId_userId_key] UNIQUE NONCLUSTERED ([competitionId],[userId])
);

CREATE NONCLUSTERED INDEX [tender_mini_evaluators_organizationId_idx] ON [dbo].[tender_mini_evaluators]([organizationId]);

CREATE TABLE [dbo].[tender_quote_scores] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [competitionId] NVARCHAR(1000) NOT NULL,
    [quoteId] NVARCHAR(1000) NOT NULL,
    [criterion] NVARCHAR(20) NOT NULL,
    [evaluatorUserId] NVARCHAR(1000) NOT NULL,
    [score] INT NOT NULL,
    [reason] NVARCHAR(1000) NOT NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [tender_quote_scores_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_quote_scores_quoteId_criterion_evaluatorUserId_key] UNIQUE NONCLUSTERED ([quoteId],[criterion],[evaluatorUserId])
);

CREATE NONCLUSTERED INDEX [tender_quote_scores_competitionId_idx] ON [dbo].[tender_quote_scores]([competitionId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
