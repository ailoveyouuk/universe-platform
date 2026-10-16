BEGIN TRAN;

-- Optional square organisation icon (branding, 2026-10-16).
ALTER TABLE [dbo].[organizations] ADD [logoIconUrl] NVARCHAR(1000) NULL;

COMMIT TRAN;
