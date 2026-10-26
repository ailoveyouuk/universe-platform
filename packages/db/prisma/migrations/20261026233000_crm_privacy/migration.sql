BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[crm_contact_profiles] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [contactId] NVARCHAR(1000) NOT NULL,
    [decisionRole] NVARCHAR(1000),
    [lawfulBasis] NVARCHAR(1000) NOT NULL CONSTRAINT [crm_contact_profiles_lawfulBasis_df] DEFAULT 'LEGITIMATE_INTERESTS',
    [lawfulBasisReason] NVARCHAR(500),
    [subscriberType] NVARCHAR(1000) NOT NULL CONSTRAINT [crm_contact_profiles_subscriberType_df] DEFAULT 'UNKNOWN',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [crm_contact_profiles_status_df] DEFAULT 'ACTIVE',
    [leftAt] DATETIME2,
    [lastVerifiedAt] DATETIME2,
    [noticeSentAt] DATETIME2,
    [retentionReviewDue] DATETIME2,
    [anonymisedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [crm_contact_profiles_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [crm_contact_profiles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [crm_contact_profiles_contactId_key] UNIQUE NONCLUSTERED ([contactId])
);
CREATE NONCLUSTERED INDEX [crm_contact_profiles_organizationId_status_idx] ON [dbo].[crm_contact_profiles]([organizationId], [status]);

CREATE TABLE [dbo].[crm_privacy_requests] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [contactId] NVARCHAR(1000),
    [requesterName] NVARCHAR(200) NOT NULL,
    [requesterEmail] NVARCHAR(300),
    [receivedAt] DATETIME2 NOT NULL,
    [identityConfirmedAt] DATETIME2,
    [dueAt] DATETIME2 NOT NULL,
    [clockStoppedAt] DATETIME2,
    [extendedUntil] DATETIME2,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [crm_privacy_requests_status_df] DEFAULT 'OPEN',
    [decision] NVARCHAR(1000),
    [exemptionReason] NVARCHAR(500),
    [completedAt] DATETIME2,
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [crm_privacy_requests_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [crm_privacy_requests_pkey] PRIMARY KEY CLUSTERED ([id])
);
CREATE NONCLUSTERED INDEX [crm_privacy_requests_organizationId_status_dueAt_idx] ON [dbo].[crm_privacy_requests]([organizationId], [status], [dueAt]);

CREATE TABLE [dbo].[crm_suppressions] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [emailHash] NVARCHAR(1000) NOT NULL,
    [reason] NVARCHAR(1000) NOT NULL,
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [crm_suppressions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [crm_suppressions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [crm_suppressions_organizationId_emailHash_key] UNIQUE NONCLUSTERED ([organizationId],[emailHash])
);

CREATE TABLE [dbo].[crm_access_log] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [contactId] NVARCHAR(1000),
    [relationshipId] NVARCHAR(1000),
    [detail] NVARCHAR(300),
    [at] DATETIME2 NOT NULL CONSTRAINT [crm_access_log_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [crm_access_log_pkey] PRIMARY KEY CLUSTERED ([id])
);
CREATE NONCLUSTERED INDEX [crm_access_log_organizationId_at_idx] ON [dbo].[crm_access_log]([organizationId], [at]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
