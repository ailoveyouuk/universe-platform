BEGIN TRAN;

-- Stakeholder registry: add VAT number as a second strong identity-matching
-- signal alongside registrationNumber (2026-10-03). Company registration
-- number and VAT number are both unique-to-a-company identifiers, so
-- autopopulate/duplicate-prevention matching now also triggers off VAT
-- number the same way it already does off name and registration number.
-- See StakeholderRegistryEntry's doc comment in schema.prisma.

ALTER TABLE [dbo].[stakeholder_registry_entries] ADD
    [vatNumber] NVARCHAR(100);

COMMIT TRAN;
