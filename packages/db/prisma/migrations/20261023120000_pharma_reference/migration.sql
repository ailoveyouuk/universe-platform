BEGIN TRY

BEGIN TRAN;

-- Reference register of authorised medicines (EMA and MHRA). Global reference data, no tenant column, no RLS.
CREATE TABLE [dbo].[pharma_references] (
    [id] NVARCHAR(1000) NOT NULL,
    [source] NVARCHAR(20) NOT NULL,
    [sourceKey] NVARCHAR(100) NOT NULL,
    [name] NVARCHAR(500) NOT NULL,
    [activeSubstances] NVARCHAR(1000),
    [inn] NVARCHAR(500),
    [atcCode] NVARCHAR(20),
    [holder] NVARCHAR(500),
    [legalStatus] NVARCHAR(20),
    [windsorCategory] NVARCHAR(20),
    [productType] NVARCHAR(20) NOT NULL,
    [status] NVARCHAR(50) NOT NULL,
    [isGeneric] BIT NOT NULL CONSTRAINT [pharma_references_isGeneric_df] DEFAULT 0,
    [isBiosimilar] BIT NOT NULL CONSTRAINT [pharma_references_isBiosimilar_df] DEFAULT 0,
    [isOrphan] BIT NOT NULL CONSTRAINT [pharma_references_isOrphan_df] DEFAULT 0,
    [therapeuticArea] NVARCHAR(1000),
    [pharmacotherapeuticGroup] NVARCHAR(500),
    [indication] NVARCHAR(max),
    [authorisedOn] DATETIME2,
    [sourceUrl] NVARCHAR(1000),
    [rawHash] NVARCHAR(64) NOT NULL,
    [firstSeenAt] DATETIME2 NOT NULL CONSTRAINT [pharma_references_firstSeenAt_df] DEFAULT CURRENT_TIMESTAMP,
    [lastSeenAt] DATETIME2 NOT NULL CONSTRAINT [pharma_references_lastSeenAt_df] DEFAULT CURRENT_TIMESTAMP,
    [removedAt] DATETIME2,
    CONSTRAINT [pharma_references_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [pharma_references_source_sourceKey_key] UNIQUE NONCLUSTERED ([source],[sourceKey])
);
CREATE NONCLUSTERED INDEX [pharma_references_atcCode_idx] ON [dbo].[pharma_references]([atcCode]);
CREATE NONCLUSTERED INDEX [pharma_references_status_idx] ON [dbo].[pharma_references]([status]);

CREATE TABLE [dbo].[pharma_reference_runs] (
    [id] NVARCHAR(1000) NOT NULL,
    [source] NVARCHAR(20) NOT NULL,
    [startedAt] DATETIME2 NOT NULL CONSTRAINT [pharma_reference_runs_startedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [finishedAt] DATETIME2,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [pharma_reference_runs_status_df] DEFAULT 'RUNNING',
    [fetched] INT NOT NULL CONSTRAINT [pharma_reference_runs_fetched_df] DEFAULT 0,
    [added] INT NOT NULL CONSTRAINT [pharma_reference_runs_added_df] DEFAULT 0,
    [changed] INT NOT NULL CONSTRAINT [pharma_reference_runs_changed_df] DEFAULT 0,
    [removed] INT NOT NULL CONSTRAINT [pharma_reference_runs_removed_df] DEFAULT 0,
    [error] NVARCHAR(max),
    CONSTRAINT [pharma_reference_runs_pkey] PRIMARY KEY CLUSTERED ([id])
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
