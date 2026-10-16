BEGIN TRAN;

-- Bug found 2026-10-16 during the Admin app forensic stress test: the plain
-- UNIQUE constraint on users.entraObjectId (from the init migration) allows at
-- most ONE row in the whole table to have a NULL entraObjectId, because SQL
-- Server treats NULLs as equal for a plain UNIQUE constraint. Invited users
-- and users whose sign-in has been reset are by definition unlinked (NULL), so
-- the platform could only ever hold one such user at a time — a second invite
-- (or a second "Reset sign-in") fails with P2002.
--
-- Fix: same pattern as 20261008130000_controlled_document_supersedes_filtered_unique —
-- a filtered unique index that only enforces uniqueness for linked identities.
-- schema.prisma keeps `@unique` (still the right application-level description).

ALTER TABLE [dbo].[users] DROP CONSTRAINT [users_entraObjectId_key];

CREATE UNIQUE INDEX [users_entraObjectId_key] ON [dbo].[users]([entraObjectId]) WHERE [entraObjectId] IS NOT NULL;

COMMIT TRAN;
