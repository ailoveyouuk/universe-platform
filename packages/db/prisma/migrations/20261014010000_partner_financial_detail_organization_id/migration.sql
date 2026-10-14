BEGIN TRAN;

-- organizationId backfill on partner_financial_details, 2026-10-14 — same
-- gap and same fix as 20261007100000_compliance_scaffolding did for
-- partner_certifications/partner_company_checks/partner_approval_history:
-- this table had no organizationId column and was never added to
-- infra/sql/row-level-security.sql's table list, so only the partnerId ->
-- partners join gave it any tenant scoping, and only when a caller
-- remembered to make that join (see partners.service.ts's
-- getFinancialDetail/upsertFinancialDetail, added the same day this gap
-- was found). Backfilled from each row's own partner's organizationId via
-- EXEC sp_executesql (GO is not valid T-SQL and `prisma migrate deploy`
-- does not batch-split on it — same reason as every other migration in
-- this project).

ALTER TABLE [dbo].[partner_financial_details] ADD [organizationId] NVARCHAR(1000);

EXEC sp_executesql N'
UPDATE pfd
SET pfd.[organizationId] = p.[organizationId]
FROM [dbo].[partner_financial_details] pfd
JOIN [dbo].[partners] p ON p.[id] = pfd.[partnerId];
';

-- Now that every existing row is backfilled, make the column mandatory
-- (matches the Prisma schema's non-nullable organizationId) and add the
-- FK + index, same convention as every other tenant table.
ALTER TABLE [dbo].[partner_financial_details] ALTER COLUMN [organizationId] NVARCHAR(1000) NOT NULL;

ALTER TABLE [dbo].[partner_financial_details] ADD CONSTRAINT [partner_financial_details_organizationId_fkey] FOREIGN KEY ([organizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

CREATE INDEX [partner_financial_details_organizationId_idx] ON [dbo].[partner_financial_details]([organizationId]);

COMMIT TRAN;
