BEGIN TRAN;

-- Stakeholder-evidence document upload (claude/product-db-test-batch-import.md
-- "Round 4", 2026-10-08). project_documents.projectId becomes nullable so a
-- document can be uploaded against something other than a Project — first
-- use: StakeholderEvidenceRecord.documentId, via the new standalone
-- /documents endpoints (documents-standalone.controller.ts). Everything else
-- about the row (blob storage, container-per-org, the SAS upload/download
-- flow) is unchanged; a NULL projectId just means "not owned by a project".
--
-- The existing FK (project_documents_projectId_fkey) already permits NULL
-- values on a nullable column without being dropped/recreated — ALTER
-- COLUMN is sufficient.
--
-- GO is not valid T-SQL and `prisma migrate deploy` does not batch-split on
-- it (same note as every migration this project has written since
-- 20261003090000) — this file is one continuous batch.

ALTER TABLE [dbo].[project_documents] ALTER COLUMN [projectId] NVARCHAR(1000) NULL;

COMMIT TRAN;
