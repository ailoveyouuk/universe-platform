BEGIN TRAN;

-- Split partner_client_details.billingAddress/deliveryAddress (single
-- free-text blocks) into standard structured address fields, each with
-- its own country, so every element of a client's billing and delivery
-- address is stored separately and usable across every app rather than
-- just displayed back as one blob (Lewis's 2026-10-02 request).

ALTER TABLE [dbo].[partner_client_details] ADD
    [billingAddressLine1] NVARCHAR(1000),
    [billingAddressLine2] NVARCHAR(1000),
    [billingCity] NVARCHAR(1000),
    [billingRegion] NVARCHAR(1000),
    [billingPostcode] NVARCHAR(1000),
    [billingCountryCode] NVARCHAR(1000),
    [deliveryAddressLine1] NVARCHAR(1000),
    [deliveryAddressLine2] NVARCHAR(1000),
    [deliveryCity] NVARCHAR(1000),
    [deliveryRegion] NVARCHAR(1000),
    [deliveryPostcode] NVARCHAR(1000),
    [deliveryCountryCode] NVARCHAR(1000);

-- A batch separator is required here: SQL Server compiles an entire
-- ad-hoc batch (everything up to the next GO) before executing any
-- statement in it, so the UPDATE below would fail to bind against the
-- columns the ALTER TABLE above just added ("Invalid column name") if
-- it stayed in the same batch — this is what broke production on first
-- deploy (2026-10-03, see architecture-decisions.md). Distinct from the
-- already-documented "CREATE FUNCTION must be the only statement in its
-- batch" issue, but the same underlying single-batch-compiles-first
-- behaviour. prisma migrate deploy splits a migration.sql on a
-- line containing only GO, same as sqlcmd.
GO

-- Best-effort carry-over of any existing free-text address into Line 1 of
-- the new structured fields, rather than silently dropping data entered
-- before this change.
UPDATE [dbo].[partner_client_details] SET [billingAddressLine1] = [billingAddress] WHERE [billingAddress] IS NOT NULL;
UPDATE [dbo].[partner_client_details] SET [deliveryAddressLine1] = [deliveryAddress] WHERE [deliveryAddress] IS NOT NULL;

GO

ALTER TABLE [dbo].[partner_client_details] DROP COLUMN
    [billingAddress],
    [deliveryAddress];

COMMIT TRAN;
