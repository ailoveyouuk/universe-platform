BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[product_master] ADD [atcCode] NVARCHAR(20) NULL, [pilUrl] NVARCHAR(1000) NULL;
CREATE NONCLUSTERED INDEX [product_master_atcCode_idx] ON [dbo].[product_master]([atcCode]);

CREATE TABLE [dbo].[product_pharma_links] (
    [id] NVARCHAR(1000) NOT NULL,
    [productMasterId] NVARCHAR(1000) NOT NULL,
    [pharmaReferenceId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [product_pharma_links_status_df] DEFAULT 'SUGGESTED',
    [score] INT NOT NULL CONSTRAINT [product_pharma_links_score_df] DEFAULT 0,
    [basis] NVARCHAR(200),
    [decidedById] NVARCHAR(100),
    [decidedByName] NVARCHAR(200),
    [decidedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [product_pharma_links_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [product_pharma_links_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [product_pharma_links_productMasterId_pharmaReferenceId_key] UNIQUE NONCLUSTERED ([productMasterId],[pharmaReferenceId])
);
CREATE NONCLUSTERED INDEX [product_pharma_links_pharmaReferenceId_idx] ON [dbo].[product_pharma_links]([pharmaReferenceId]);
CREATE NONCLUSTERED INDEX [product_pharma_links_status_idx] ON [dbo].[product_pharma_links]([status]);

ALTER TABLE [dbo].[product_pharma_links] ADD CONSTRAINT [product_pharma_links_productMasterId_fkey] FOREIGN KEY ([productMasterId]) REFERENCES [dbo].[product_master]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE [dbo].[product_pharma_links] ADD CONSTRAINT [product_pharma_links_pharmaReferenceId_fkey] FOREIGN KEY ([pharmaReferenceId]) REFERENCES [dbo].[pharma_references]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
