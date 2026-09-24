import { Prisma } from "@prisma/client";
import { prisma } from "./index";

/**
 * Drives the Azure SQL Row-Level Security policy in
 * infra/sql/row-level-security.sql — see that file's header comment for the
 * full picture. RLS reads SESSION_CONTEXT, which is per-CONNECTION, and
 * Prisma pools connections, so the only way to guarantee the session-context
 * call and the queries that follow share one connection is to run them
 * inside the same prisma.$transaction(...).
 *
 * Every tenant-facing request handler should wrap its database work in
 * withTenantContext(organizationId, ...) rather than calling `prisma`
 * directly. This is the runtime half of the RLS backstop; the application
 * layer half is tenantScope() in apps/api/src/common/tenant-scoped.ts. A
 * request that uses tenantScope() but never calls withTenantContext() still
 * gets correct results (the WHERE clause is still right) but loses the
 * database-layer backstop that RLS exists to provide — the two are meant to
 * be used together, not as alternatives.
 *
 * NOT YET WIRED into every apps/api request path — that's a follow-up once
 * a real database exists to test against (see backend-launch-checklist.md,
 * Phase A). This file is the primitive; a NestJS interceptor that calls it
 * automatically for every tenant-scoped request is the next step.
 */
export async function withTenantContext<T>(
  organizationId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`EXEC sp_set_session_context @key = N'organizationId', @value = ${organizationId}, @read_only = 1;`;
    return fn(tx);
  });
}

/**
 * The one sanctioned cross-tenant path (e.g. an Admin-app "all
 * organizations" view, or platform-staff support tooling) — see
 * apps/api/src/common/tenant-scoped.ts for the rule that this must always
 * be a separately-named method, never a flag on the same method a regular
 * tenant-scoped request calls. Never call this based on anything the caller
 * supplies in a request; the decision to use it belongs entirely to
 * server-side code gated on the caller's verified PlatformStaffRole.
 */
export async function withPlatformStaffContext<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`EXEC sp_set_session_context @key = N'isPlatformStaff', @value = 1, @read_only = 1;`;
    return fn(tx);
  });
}
