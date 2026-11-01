BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[email_recipients] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [eventKey] NVARCHAR(60) NOT NULL,
    [userId] NVARCHAR(1000),
    [address] NVARCHAR(320),
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [email_recipients_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [email_recipients_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [email_recipients_organizationId_eventKey_idx] ON [dbo].[email_recipients]([organizationId], [eventKey]);

CREATE TABLE [dbo].[email_outbox] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [eventKey] NVARCHAR(60) NOT NULL,
    [toAddress] NVARCHAR(320) NOT NULL,
    [subject] NVARCHAR(300) NOT NULL,
    [body] NVARCHAR(2000) NOT NULL,
    [link] NVARCHAR(500),
    [status] NVARCHAR(10) NOT NULL CONSTRAINT [email_outbox_status_df] DEFAULT 'QUEUED',
    [attempts] INT NOT NULL CONSTRAINT [email_outbox_attempts_df] DEFAULT 0,
    [lastError] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [email_outbox_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [sentAt] DATETIME2,
    CONSTRAINT [email_outbox_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [email_outbox_status_createdAt_idx] ON [dbo].[email_outbox]([status], [createdAt]);
CREATE NONCLUSTERED INDEX [email_outbox_organizationId_createdAt_idx] ON [dbo].[email_outbox]([organizationId], [createdAt]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
