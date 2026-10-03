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

-- Best-effort carry-over of any existing free-text address into Line 1 of
-- the new structured fields, rather than silently dropping data entered
-- before this change.
--
-- Run via sp_executesql rather than a direct UPDATE: the column names
-- referenced here were only just added by the ALTER TABLE above, and SQL
-- Server compiles/binds an entire ad-hoc batch before executing any
-- statement in it, so a direct UPDATE referencing them in the same batch
-- fails to bind ("Invalid column name") even though the ALTER TABLE runs
-- first at execution time -- this is what broke production on first
-- deploy (2026-10-03, see architecture-decisions.md "Round 7"/"Round 8").
-- A GO batch separator (the first fix attempted) does NOT work here
-- either: GO is a sqlcmd/SSMS client-side convention, not valid T-SQL on
-- its own, and `prisma migrate deploy` executes this file's raw SQL
-- directly via its own engine -- it does not recognise or split on GO
-- the way sqlcmd does, so inserting GO breaks production with
-- "Incorrect syntax near 'GO'" instead. Wrapping the UPDATE text in
-- sp_executesql defers its parsing/binding to its own execution step
-- (after the ALTER TABLE has already run), without needing any batch
-- separator at all -- this works identically whether the file is run by
-- sqlcmd or by Prisma's own raw-SQL execution, which is why it's the
-- correct fix and GO was not.
EXEC sp_executesql N'UPDATE [dbo].[partner_client_details] SET [billingAddressLine1] = [billingAddress] WHERE [billingAddress] IS NOT NULL;';
EXEC sp_executesql N'UPDATE [dbo].[partner_client_details] SET [deliveryAddressLine1] = [deliveryAddress] WHERE [deliveryAddress] IS NOT NULL;';

ALTER TABLE [dbo].[partner_client_details] DROP COLUMN
    [billingAddress],
    [deliveryAddress];

COMMIT TRAN;
