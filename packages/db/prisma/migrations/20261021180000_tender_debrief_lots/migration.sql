BEGIN TRY

BEGIN TRAN;

-- Step 7 (lots): each bidder's own per-lot outcome, frozen at award. Nullable; existing debriefs unaffected. RLS unchanged.
ALTER TABLE [dbo].[tender_debriefs] ADD [lotsJson] NVARCHAR(max);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
