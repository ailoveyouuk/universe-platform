BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[product_pharma_links] ADD [isSimulated] BIT NOT NULL CONSTRAINT [product_pharma_links_isSimulated_df] DEFAULT 0;
CREATE NONCLUSTERED INDEX [product_pharma_links_isSimulated_idx] ON [dbo].[product_pharma_links]([isSimulated]);
-- Backfill: any link on a simulated product is simulated.
EXEC('UPDATE l SET l.isSimulated = 1 FROM [dbo].[product_pharma_links] l JOIN [dbo].[product_master] p ON p.id = l.productMasterId WHERE p.isSimulated = 1');

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
