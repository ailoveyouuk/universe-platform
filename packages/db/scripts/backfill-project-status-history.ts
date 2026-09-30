/**
 * One-off backfill for ProjectStatusHistory — added 2026-09-30, see
 * ProjectStatusHistory's doc comment in schema.prisma /
 * project-stage-navigation-plan.md. Every project that existed before this
 * feature has no real stage-transition history, so this inserts a single,
 * honest starting row per project: status = the project's CURRENT status,
 * enteredAt = the project's createdAt. That's a deliberate "we don't know
 * the real history before this feature existed" starting point, not a
 * fabricated one — the plan's own doc is explicit about this being honest
 * rather than invented.
 *
 * Runs entirely under withPlatformStaffContext — projects/project_status_history
 * are both RLS-protected (see row-level-security.sql), so a bare `prisma.*`
 * call here would see/write nothing, same lesson as the tenant-context
 * fixes in projects.service.ts. This is a legitimate one-off cross-tenant
 * admin job (every org, not one), matching the pattern aggregate-etl.ts
 * already established for the same reason.
 *
 * Idempotent: skips any project that already has at least one
 * ProjectStatusHistory row (e.g. a project created after this feature
 * shipped, which already got its first row from ProjectsService.create).
 *
 * Run on a machine that can reach the real Azure SQL database (this
 * sandbox cannot), with DATABASE_URL set to the app connection string,
 * AFTER the migration in this same commit has been applied:
 *
 *   npx.cmd tsx scripts/backfill-project-status-history.ts
 */
import { prisma, withPlatformStaffContext } from "../src/index";

async function main() {
  const { inserted, skipped } = await withPlatformStaffContext(async (tx) => {
    const projects = await tx.project.findMany({
      select: { id: true, organizationId: true, status: true, createdAt: true },
    });

    let insertedCount = 0;
    let skippedCount = 0;

    for (const project of projects) {
      const existingCount = await tx.projectStatusHistory.count({ where: { projectId: project.id } });
      if (existingCount > 0) {
        skippedCount++;
        continue;
      }
      await tx.projectStatusHistory.create({
        data: {
          organizationId: project.organizationId,
          projectId: project.id,
          status: project.status,
          enteredAt: project.createdAt,
        },
      });
      insertedCount++;
    }

    return { inserted: insertedCount, skipped: skippedCount };
  });

  console.log(`Backfilled ${inserted} project(s), skipped ${skipped} already-covered project(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
