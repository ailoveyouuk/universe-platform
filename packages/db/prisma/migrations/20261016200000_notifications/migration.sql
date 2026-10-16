BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[notifications] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [recipientUserId] NVARCHAR(1000) NOT NULL,
    [actorUserId] NVARCHAR(1000),
    [kind] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL CONSTRAINT [notifications_category_df] DEFAULT 'PROJECT',
    [title] NVARCHAR(300) NOT NULL,
    [body] NVARCHAR(1000),
    [link] NVARCHAR(500),
    [subjectType] NVARCHAR(1000),
    [subjectId] NVARCHAR(1000),
    [requiresAction] BIT NOT NULL CONSTRAINT [notifications_requiresAction_df] DEFAULT 0,
    [actionStatus] NVARCHAR(1000),
    [dueDate] DATETIME2,
    [readAt] DATETIME2,
    [completedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [notifications_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [notifications_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notifications_recipientUserId_readAt_idx] ON [dbo].[notifications]([recipientUserId], [readAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notifications_recipientUserId_requiresAction_actionStatus_idx] ON [dbo].[notifications]([recipientUserId], [requiresAction], [actionStatus]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [notifications_organizationId_idx] ON [dbo].[notifications]([organizationId]);

-- AddForeignKey
ALTER TABLE [dbo].[notifications] ADD CONSTRAINT [notifications_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[notifications] ADD CONSTRAINT [notifications_recipientUserId_fkey] FOREIGN KEY ([recipientUserId]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[notifications] ADD CONSTRAINT [notifications_actorUserId_fkey] FOREIGN KEY ([actorUserId]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

