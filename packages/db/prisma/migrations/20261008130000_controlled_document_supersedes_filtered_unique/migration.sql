BEGIN TRAN;

-- Bug found 2026-10-08 while seeding Phase 3 demo data: the plain UNIQUE
-- constraint on controlled_documents.supersedesId (added in
-- 20261008090000_controlled_documents) allows at most ONE row across the
-- WHOLE TABLE to have a NULL supersedesId — SQL Server, unlike Postgres,
-- treats NULLs as equal for a plain UNIQUE constraint. Since most
-- ControlledDocument rows legitimately have no predecessor (a fresh SOP/
-- policy, not a new version of an existing one), this made it impossible
-- for ANY organisation to register a second controlled document at all —
-- confirmed by a real P2002 (controlled_documents_supersedesId_key) the
-- first time more than one row was inserted. Not a seed-script-only
-- problem: this would have hit Lewis (or any org) the first time they
-- tried to add a second SOP/policy through the real UI.
--
-- Fix: replace the plain unique constraint with a FILTERED unique index
-- that only applies WHERE supersedesId IS NOT NULL — multiple NULLs are
-- then allowed (any number of documents with no predecessor), while still
-- enforcing "at most one document supersedes any given document" for the
-- real chain-forming case. schema.prisma's `@unique` on supersedesId is
-- left as-is (it still correctly describes the 1:1 application-level
-- relationship Prisma needs to type supersedes/supersededBy correctly) —
-- only the physical DB implementation changes here, same pattern as every
-- other manual-DDL migration in this project.

ALTER TABLE [dbo].[controlled_documents] DROP CONSTRAINT [controlled_documents_supersedesId_key];

CREATE UNIQUE INDEX [controlled_documents_supersedesId_key] ON [dbo].[controlled_documents]([supersedesId]) WHERE [supersedesId] IS NOT NULL;

COMMIT TRAN;
