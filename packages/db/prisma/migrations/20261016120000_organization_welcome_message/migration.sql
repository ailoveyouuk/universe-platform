BEGIN TRAN;

-- Per-organisation dashboard welcome line (branding, 2026-10-16).
ALTER TABLE [dbo].[organizations] ADD [welcomeMessage] NVARCHAR(1000) NULL;

COMMIT TRAN;
