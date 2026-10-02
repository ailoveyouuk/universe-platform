BEGIN TRAN;

-- Stakeholder registry + product-database attribution (2026-10-02). See
-- StakeholderRegistryEntry's doc comment in schema.prisma and
-- claude/sop-driven-quality-roadmap.md Section B1/B3/C for the full
-- design: cross-tenant duplicate-prevention when onboarding a
-- manufacturer/supplier, plus the identity-consent gating that makes a
-- product's manufacturer/supplier name safe to reveal in the Universe
-- Product Database. Deliberately NOT added to row-level-security.sql —
-- stakeholder_registry_entries carries no organizationId column, same
-- category as product_master (see that script's exclusion-list comment).

-- CreateTable: stakeholder_registry_entries
CREATE TABLE [dbo].[stakeholder_registry_entries] (
    [id] NVARCHAR(1000) NOT NULL,
    [normalizedName] NVARCHAR(1000) NOT NULL,
    [legalName] NVARCHAR(1000) NOT NULL,
    [countryCode] NVARCHAR(1000),
    [website] NVARCHAR(1000),
    [registrationNumber] NVARCHAR(1000),
    [stakeholderTypes] NVARCHAR(max) NOT NULL,
    [linkedOrganizationId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [stakeholder_registry_entries_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [stakeholder_registry_entries_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [stakeholder_registry_entries_normalizedName_idx] ON [dbo].[stakeholder_registry_entries]([normalizedName]);
CREATE NONCLUSTERED INDEX [stakeholder_registry_entries_registrationNumber_idx] ON [dbo].[stakeholder_registry_entries]([registrationNumber]);
CREATE NONCLUSTERED INDEX [stakeholder_registry_entries_linkedOrganizationId_idx] ON [dbo].[stakeholder_registry_entries]([linkedOrganizationId]);

-- AddForeignKey
ALTER TABLE [dbo].[stakeholder_registry_entries] ADD CONSTRAINT [stakeholder_registry_entries_linkedOrganizationId_fkey] FOREIGN KEY ([linkedOrganizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AlterTable: partners — links a tenant-private Partner to the shared
-- registry row for the same real-world company.
ALTER TABLE [dbo].[partners] ADD
    [registryEntryId] NVARCHAR(1000);

-- CreateIndex
CREATE NONCLUSTERED INDEX [partners_registryEntryId_idx] ON [dbo].[partners]([registryEntryId]);

-- AddForeignKey
ALTER TABLE [dbo].[partners] ADD CONSTRAINT [partners_registryEntryId_fkey] FOREIGN KEY ([registryEntryId]) REFERENCES [dbo].[stakeholder_registry_entries]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AlterTable: product_master — attribution (which organisation originally
-- contributed this entry, and in what capacity). Provenance only, not
-- used for access control — product_master stays globally readable, same
-- as today.
ALTER TABLE [dbo].[product_master] ADD
    [addedByOrganizationId] NVARCHAR(1000),
    [addedByOrganizationType] NVARCHAR(1000);

-- CreateIndex
CREATE NONCLUSTERED INDEX [product_master_addedByOrganizationId_idx] ON [dbo].[product_master]([addedByOrganizationId]);

-- AddForeignKey
ALTER TABLE [dbo].[product_master] ADD CONSTRAINT [product_master_addedByOrganizationId_fkey] FOREIGN KEY ([addedByOrganizationId]) REFERENCES [dbo].[organizations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;
