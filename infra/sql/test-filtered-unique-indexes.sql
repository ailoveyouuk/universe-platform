-- Test-database only. Production gets these via prisma migrations (e.g.
-- 20261016090000_users_entra_object_id_filtered_unique); the test DB is built
-- with `prisma db push`, which can only create plain UNIQUE constraints —
-- and on SQL Server those allow a single NULL per table. Replace them with
-- the same filtered unique indexes production has so tests exercise real behaviour.
ALTER TABLE [dbo].[users] DROP CONSTRAINT [users_entraObjectId_key];
GO
CREATE UNIQUE INDEX [users_entraObjectId_key] ON [dbo].[users]([entraObjectId]) WHERE [entraObjectId] IS NOT NULL;
GO
