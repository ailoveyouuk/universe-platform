-- A line can name which of its project's delivery countries it goes to (null = the project's primary country).
ALTER TABLE [dbo].[project_lines] ADD [destinationCountryCode] CHAR(2) NULL;
