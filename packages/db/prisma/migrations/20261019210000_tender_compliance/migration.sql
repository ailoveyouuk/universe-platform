BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[tenders] ADD
    [timeZone] NVARCHAR(1000),
    [standstillEnabled] BIT NOT NULL CONSTRAINT [tenders_standstillEnabled_df] DEFAULT 0,
    [standstillWorkingDays] INT,
    [publicNotice] BIT NOT NULL CONSTRAINT [tenders_publicNotice_df] DEFAULT 0,
    [requireIntegrityPledge] BIT NOT NULL CONSTRAINT [tenders_requireIntegrityPledge_df] DEFAULT 1,
    [requireExclusionDeclaration] BIT NOT NULL CONSTRAINT [tenders_requireExclusionDeclaration_df] DEFAULT 1;

-- AlterTable
ALTER TABLE [dbo].[tender_participations] ADD
    [integrityPledgeAt] DATETIME2,
    [exclusionDeclaredAt] DATETIME2,
    [exclusionNoGrounds] BIT,
    [exclusionGroundsJson] NVARCHAR(max),
    [exclusionExplanation] NVARCHAR(max);

-- AlterTable
ALTER TABLE [dbo].[tender_events] ADD
    [prevHash] CHAR(64),
    [hash] CHAR(64);

-- CreateTable
CREATE TABLE [dbo].[tender_addenda] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [number] INT NOT NULL,
    [title] NVARCHAR(300) NOT NULL,
    [body] NVARCHAR(max) NOT NULL,
    [requiresAcknowledgement] BIT NOT NULL CONSTRAINT [tender_addenda_requiresAcknowledgement_df] DEFAULT 1,
    [newClosingAt] DATETIME2,
    [createdById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [tender_addenda_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_addenda_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_addenda_tenderId_number_key] UNIQUE NONCLUSTERED ([tenderId],[number])
);

-- CreateTable
CREATE TABLE [dbo].[tender_addendum_acks] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [issuerOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [addendumId] NVARCHAR(1000) NOT NULL,
    [acknowledgedById] NVARCHAR(1000),
    [acknowledgedAt] DATETIME2 NOT NULL CONSTRAINT [tender_addendum_acks_acknowledgedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_addendum_acks_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tender_addendum_acks_addendumId_organizationId_key] UNIQUE NONCLUSTERED ([addendumId],[organizationId])
);

-- CreateTable
CREATE TABLE [dbo].[tender_screenings] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [screenedOrganisationId] NVARCHAR(1000) NOT NULL,
    [listsJson] NVARCHAR(max) NOT NULL,
    [outcome] NVARCHAR(1000) NOT NULL,
    [notes] NVARCHAR(max),
    [screenedOn] DATETIME2 NOT NULL,
    [recordedById] NVARCHAR(1000),
    [recordedAt] DATETIME2 NOT NULL CONSTRAINT [tender_screenings_recordedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [tender_screenings_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_addenda_organizationId_idx] ON [dbo].[tender_addenda]([organizationId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_addendum_acks_issuerOrganizationId_tenderId_idx] ON [dbo].[tender_addendum_acks]([issuerOrganizationId], [tenderId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_screenings_tenderId_idx] ON [dbo].[tender_screenings]([tenderId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [tender_screenings_organizationId_idx] ON [dbo].[tender_screenings]([organizationId]);

-- AddForeignKey
ALTER TABLE [dbo].[tender_addenda] ADD CONSTRAINT [tender_addenda_tenderId_fkey] FOREIGN KEY ([tenderId]) REFERENCES [dbo].[tenders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
