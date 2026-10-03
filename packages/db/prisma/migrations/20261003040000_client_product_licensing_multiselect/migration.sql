BEGIN TRAN;

-- Replace partner_client_details.productCategoryLicensingNotes (free
-- text) with a predefined multi-select of standard product-category
-- licences/permits (ProductLicensingType, comma-joined -- same convention
-- as scopeOfSupply) plus a separate "other" free-text note, so clients'
-- licensing data is standardised and linkable across every app rather
-- than entered as free text (Lewis's 2026-10-02 request).

ALTER TABLE [dbo].[partner_client_details] ADD
    [productCategoryLicenses] NVARCHAR(max),
    [productCategoryLicensingOtherNotes] NVARCHAR(max);

-- Best-effort carry-over: existing free text can't be mapped onto the
-- predefined list automatically, so it moves to the new "other notes"
-- field rather than being dropped.
--
-- Run via sp_executesql, not a direct UPDATE or a GO-separated batch --
-- see the identical fix/explanation in
-- 20261003030000_split_client_billing_delivery_address/migration.sql
-- (same SQL Server single-batch-compiles-first issue; GO does not work
-- as a batch separator under `prisma migrate deploy`, which is what
-- actually broke production, not the original issue this was meant to
-- fix).
EXEC sp_executesql N'UPDATE [dbo].[partner_client_details] SET [productCategoryLicensingOtherNotes] = [productCategoryLicensingNotes] WHERE [productCategoryLicensingNotes] IS NOT NULL;';

ALTER TABLE [dbo].[partner_client_details] DROP COLUMN [productCategoryLicensingNotes];

COMMIT TRAN;
