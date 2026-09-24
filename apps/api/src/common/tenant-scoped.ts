/**
 * TENANT ISOLATION — READ THIS BEFORE ADDING A NEW QUERY.
 *
 * Every domain table carries organizationId directly (see the schema doc
 * comment in packages/db/prisma/schema.prisma). This helper is the ONE
 * place that turns "the caller's organization" into a Prisma `where` clause,
 * so no service can accidentally write `prisma.project.findMany()` without
 * a tenant filter.
 *
 * Platform staff (see PlatformStaffRole) are the only exception, and they
 * must go through a SEPARATE, explicitly-named path (e.g.
 * findAllAcrossOrganizations) that is never reachable from a normal
 * tenant-facing endpoint — never make tenant scoping optional on the same
 * method a regular user calls.
 *
 * This is the application-layer half of tenant isolation. The database-layer
 * half is Azure SQL Row-Level Security, applied per-table as a backstop —
 * see infra/sql/row-level-security.sql (written and ready to run against
 * the database once it's provisioned — see backend-launch-checklist.md,
 * Phase B7). Both layers must independently enforce the boundary. Driving
 * RLS from the app requires wrapping requests in withTenantContext() from
 * @universe/db — see packages/db/src/tenant-context.ts.
 */
export function tenantScope(organizationId: string) {
  return { organizationId };
}
