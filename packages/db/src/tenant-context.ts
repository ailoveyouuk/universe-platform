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
 * Both keys are set explicitly on every call, not just the one this
 * function "owns", AND reset back to a neutral default (NULL /
 * isPlatformStaff=0) before the transaction returns — deliberately, for
 * three reasons found the hard way in CI 2026-09-24:
 *
 *   1. `@read_only = 1` (an earlier version of this file used it, meaning to
 *      guard against the app overwriting it mid-request) turns out to lock
 *      that key for the rest of the CONNECTION, not the transaction. Since
 *      Prisma reuses pooled connections across unrelated transactions, the
 *      second withTenantContext() call for a DIFFERENT organization on a
 *      reused connection failed outright ("Cannot set key 'organizationId'
 *      in the session context. The key has been set as read_only for this
 *      session.", SQL error 15664). Removed — @read_only doesn't fit a
 *      pooled-connection model at all.
 *   2. With @read_only gone, a value set by an EARLIER transaction can
 *      linger on a connection the pool later reuses for something else.
 *      Left unaddressed, a connection that once ran under
 *      withPlatformStaffContext() and got reused for an ordinary
 *      withTenantContext() call could keep isPlatformStaff=1 from the
 *      earlier transaction — a real cross-tenant leak, not just a test
 *      flake. So every call here resets BOTH keys at the START, every time,
 *      rather than trusting the pool to hand back a clean connection.
 *   3. That alone isn't enough: a connection released back to the pool
 *      still carries whatever context the last transaction left set, so a
 *      bare `prisma.*` call made OUTSIDE either wrapper (which should see
 *      no tenant context at all — that's the RLS default-deny backstop)
 *      can inherit a leftover organizationId/isPlatformStaff from an
 *      earlier, unrelated transaction on the same reused connection.
 *      Confirmed in CI: a test asserting "no session context set sees zero
 *      rows" got 1 row back, from a prior test's org still set on the
 *      connection it happened to be handed. So both keys are also reset
 *      back to NULL/0 at the END of every call, before the transaction
 *      commits and the connection goes back to the pool — a connection
 *      should never leave one of these wrappers carrying context forward.
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
    await tx.$executeRaw`EXEC sp_set_session_context @key = N'organizationId', @value = ${organizationId};`;
    await tx.$executeRaw`EXEC sp_set_session_context @key = N'isPlatformStaff', @value = 0;`;
    const result = await fn(tx);
    await tx.$executeRaw`EXEC sp_set_session_context @key = N'organizationId', @value = NULL;`;
    await tx.$executeRaw`EXEC sp_set_session_context @key = N'isPlatformStaff', @value = 0;`;
    return result;
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
    await tx.$executeRaw`EXEC sp_set_session_context @key = N'isPlatformStaff', @value = 1;`;
    await tx.$executeRaw`EXEC sp_set_session_context @key = N'organizationId', @value = NULL;`;
    const result = await fn(tx);
    await tx.$executeRaw`EXEC sp_set_session_context @key = N'isPlatformStaff', @value = 0;`;
    await tx.$executeRaw`EXEC sp_set_session_context @key = N'organizationId', @value = NULL;`;
    return result;
  });
}
