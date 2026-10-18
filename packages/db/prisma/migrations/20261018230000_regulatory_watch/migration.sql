BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[regulatory_watch_items] (
    [id] NVARCHAR(1000) NOT NULL,
    [source] NVARCHAR(1000) NOT NULL,
    [sourceReference] NVARCHAR(1000) NOT NULL,
    [authority] NVARCHAR(1000) NOT NULL,
    [noticeType] NVARCHAR(1000) NOT NULL,
    [severity] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [summary] NVARCHAR(max) NOT NULL,
    [actionRequired] NVARCHAR(max),
    [affectedText] NVARCHAR(max),
    [firmName] NVARCHAR(1000),
    [countryCodes] NVARCHAR(1000),
    [issueDate] DATETIME2 NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [regulatory_watch_items_status_df] DEFAULT 'OPEN',
    [url] NVARCHAR(1000),
    [rawHash] NVARCHAR(1000) NOT NULL,
    [firstSeenAt] DATETIME2 NOT NULL CONSTRAINT [regulatory_watch_items_firstSeenAt_df] DEFAULT CURRENT_TIMESTAMP,
    [lastSeenAt] DATETIME2 NOT NULL CONSTRAINT [regulatory_watch_items_lastSeenAt_df] DEFAULT CURRENT_TIMESTAMP,
    [isSimulated] BIT NOT NULL CONSTRAINT [regulatory_watch_items_isSimulated_df] DEFAULT 0,
    CONSTRAINT [regulatory_watch_items_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [regulatory_watch_items_source_sourceReference_key] UNIQUE NONCLUSTERED ([source],[sourceReference])
);

-- CreateTable
CREATE TABLE [dbo].[regulatory_watch_matches] (
    [id] NVARCHAR(1000) NOT NULL,
    [itemId] NVARCHAR(1000) NOT NULL,
    [productMasterId] NVARCHAR(1000) NOT NULL,
    [confidence] FLOAT(53) NOT NULL,
    [matchBasis] NVARCHAR(1000) NOT NULL,
    [matchDetail] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [regulatory_watch_matches_status_df] DEFAULT 'PENDING',
    [reviewedById] NVARCHAR(1000),
    [reviewedByName] NVARCHAR(1000),
    [reviewedAt] DATETIME2,
    [reviewNotes] NVARCHAR(max),
    [safetyNoticeId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [regulatory_watch_matches_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [regulatory_watch_matches_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [regulatory_watch_matches_itemId_productMasterId_key] UNIQUE NONCLUSTERED ([itemId],[productMasterId])
);

-- CreateTable
CREATE TABLE [dbo].[regulatory_watch_runs] (
    [id] NVARCHAR(1000) NOT NULL,
    [source] NVARCHAR(1000) NOT NULL,
    [startedAt] DATETIME2 NOT NULL CONSTRAINT [regulatory_watch_runs_startedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [finishedAt] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [regulatory_watch_runs_status_df] DEFAULT 'RUNNING',
    [fetched] INT NOT NULL CONSTRAINT [regulatory_watch_runs_fetched_df] DEFAULT 0,
    [newItems] INT NOT NULL CONSTRAINT [regulatory_watch_runs_newItems_df] DEFAULT 0,
    [changedItems] INT NOT NULL CONSTRAINT [regulatory_watch_runs_changedItems_df] DEFAULT 0,
    [newMatches] INT NOT NULL CONSTRAINT [regulatory_watch_runs_newMatches_df] DEFAULT 0,
    [error] NVARCHAR(max),
    [isSimulated] BIT NOT NULL CONSTRAINT [regulatory_watch_runs_isSimulated_df] DEFAULT 0,
    CONSTRAINT [regulatory_watch_runs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [regulatory_watch_items_issueDate_idx] ON [dbo].[regulatory_watch_items]([issueDate]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [regulatory_watch_items_isSimulated_status_idx] ON [dbo].[regulatory_watch_items]([isSimulated], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [regulatory_watch_matches_status_confidence_idx] ON [dbo].[regulatory_watch_matches]([status], [confidence]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [regulatory_watch_matches_productMasterId_status_idx] ON [dbo].[regulatory_watch_matches]([productMasterId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [regulatory_watch_runs_source_startedAt_idx] ON [dbo].[regulatory_watch_runs]([source], [startedAt]);

-- AddForeignKey
ALTER TABLE [dbo].[regulatory_watch_matches] ADD CONSTRAINT [regulatory_watch_matches_itemId_fkey] FOREIGN KEY ([itemId]) REFERENCES [dbo].[regulatory_watch_items]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[regulatory_watch_matches] ADD CONSTRAINT [regulatory_watch_matches_productMasterId_fkey] FOREIGN KEY ([productMasterId]) REFERENCES [dbo].[product_master]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

