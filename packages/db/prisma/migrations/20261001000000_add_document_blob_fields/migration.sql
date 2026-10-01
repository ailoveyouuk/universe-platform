BEGIN TRAN;

-- AlterTable: project_documents — Phase 2b, Blob Storage (decided
-- 2026-10-01, see architecture-decisions.md "Document storage" open
-- question / backend-launch-checklist.md Phase 2b). blobName is the blob's
-- own path within its org's private container, kept separate from the
-- existing `url` column so BlobStorageService never has to re-derive it by
-- parsing a URL apart (see ProjectDocument.blobName's doc comment in
-- schema.prisma). The other three columns are display/validation metadata
-- captured at upload time, all nullable since pre-existing/legacy rows
-- (SharePoint-link era) never had them.
ALTER TABLE [dbo].[project_documents] ADD
    [blobName] NVARCHAR(1000),
    [fileName] NVARCHAR(1000),
    [fileSizeBytes] INT,
    [mimeType] NVARCHAR(1000);

COMMIT TRAN;
