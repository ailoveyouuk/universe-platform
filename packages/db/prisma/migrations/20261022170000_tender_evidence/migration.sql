BEGIN TRY

BEGIN TRAN;

-- Step 7 part 3: structured contract evidence.
CREATE TABLE [dbo].[tender_evidence] (
    [id] NVARCHAR(1000) NOT NULL,
    [organizationId] NVARCHAR(1000) NOT NULL,
    [awardedOrganizationId] NVARCHAR(1000) NOT NULL,
    [tenderId] NVARCHAR(1000) NOT NULL,
    [contractId] NVARCHAR(1000) NOT NULL,
    [kind] NVARCHAR(40) NOT NULL,
    [title] NVARCHAR(300) NOT NULL,
    [description] NVARCHAR(2000),
    [reference] NVARCHAR(200),
    [evidenceDate] DATETIME2 NOT NULL,
    [linkType] NVARCHAR(20),
    [linkId] NVARCHAR(1000),
    [blobName] NVARCHAR(500),
    [fileName] NVARCHAR(300),
    [mimeType] NVARCHAR(200),
    [fileSizeBytes] INT,
    [sha256] NVARCHAR(64),
    [recordedByOrganizationId] NVARCHAR(1000) NOT NULL,
    [recordedById] NVARCHAR(1000),
    [recordedAt] DATETIME2 NOT NULL CONSTRAINT [tender_evidence_recordedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [acknowledgedByOrganizationId] NVARCHAR(1000),
    [acknowledgedById] NVARCHAR(1000),
    [acknowledgedAt] DATETIME2,
    [withdrawnAt] DATETIME2,
    [withdrawnReason] NVARCHAR(1000),
    CONSTRAINT [tender_evidence_pkey] PRIMARY KEY CLUSTERED ([id])
);
CREATE NONCLUSTERED INDEX [tender_evidence_contractId_idx] ON [dbo].[tender_evidence]([contractId]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
