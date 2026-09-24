import { randomUUID } from "node:crypto";
import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { EntraAuthGuard, type RequestUser } from "../src/auth/entra-auth.guard";

/**
 * Proves the invite-then-link flow described in entra-auth.guard.ts's own
 * doc comment actually holds: INVITED links on first matching-email sign-in
 * and flips to ACTIVE; a never-invited email is rejected outright with no
 * auto-provisioning; DEACTIVATED stays rejected even once previously linked.
 *
 * Exercises the guard exactly as it runs in production — real Prisma
 * queries against the test database, no CIAM token configured so the
 * guard's own local-dev fallback path drives `oid`/`email`, which is
 * exactly the code path the fallback exists to make testable without a
 * live CIAM tenant. See backend-launch-checklist.md, Phase A.
 */
describe("EntraAuthGuard — invite-then-link flow", () => {
  const suffix = randomUUID().slice(0, 8);
  let orgId: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const org = await createOrganizationWithDefaultRoles({
      name: `Auth Test Org ${suffix}`,
      slug: `auth-test-org-${suffix}`,
    });
    orgId = org.id;
  });

  afterEach(async () => {
    // The local-dev fallback always uses a fixed oid ("local-dev"), so any
    // user it linked in one test must be cleared before the next runs, or
    // the entraObjectId lookup would find last test's user regardless of
    // LOCAL_DEV_EMAIL.
    delete process.env.LOCAL_DEV_EMAIL;
    if (createdUserIds.length) {
      await withPlatformStaffContext((tx) => tx.user.deleteMany({ where: { id: { in: createdUserIds } } }));
      createdUserIds.length = 0;
    }
  });

  afterAll(async () => {
    // createOrganizationWithDefaultRoles creates this org's roles AND a
    // DataSharingConsent row too (2026-09-24) — FK order (no cascading
    // deletes anywhere in this schema): role_permissions before roles,
    // roles/data_sharing_consents before the organization itself.
    await withPlatformStaffContext((tx) => tx.rolePermission.deleteMany({ where: { role: { organizationId: orgId } } }));
    await withPlatformStaffContext((tx) => tx.role.deleteMany({ where: { organizationId: orgId } }));
    await prisma.dataSharingConsent.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.delete({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  function fakeContext(req: Record<string, unknown> = { headers: { authorization: "Bearer test-token" } }) {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  }

  async function seedUser(data: { email: string; status: string; entraObjectId?: string | null }) {
    const user = await withPlatformStaffContext((tx) =>
      tx.user.create({
        data: {
          organizationId: orgId,
          email: data.email,
          forename: "Test",
          surname: "User",
          status: data.status,
          entraObjectId: data.entraObjectId ?? null,
        },
      }),
    );
    createdUserIds.push(user.id);
    return user;
  }

  it("rejects a token with no bearer header", async () => {
    const guard = new EntraAuthGuard();
    await expect(guard.canActivate(fakeContext({ headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects an email that was never invited (no auto-provisioning)", async () => {
    process.env.LOCAL_DEV_EMAIL = `never-invited-${suffix}@example.com`;
    const guard = new EntraAuthGuard();
    await expect(guard.canActivate(fakeContext())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("links an INVITED user on first sign-in and flips status to ACTIVE", async () => {
    const email = `invited-${suffix}@example.com`;
    const invited = await seedUser({ email, status: "INVITED" });
    expect(invited.entraObjectId).toBeNull();

    process.env.LOCAL_DEV_EMAIL = email;
    const guard = new EntraAuthGuard();
    const req: { headers: Record<string, string>; user?: RequestUser } = {
      headers: { authorization: "Bearer test-token" },
    };
    const ctx = fakeContext(req);

    const activated = await guard.canActivate(ctx);
    expect(activated).toBe(true);
    expect(req.user?.email).toBe(email);
    expect(req.user?.organizationId).toBe(orgId);

    const stored = await withPlatformStaffContext((tx) => tx.user.findUniqueOrThrow({ where: { id: invited.id } }));
    expect(stored.status).toBe("ACTIVE");
    expect(stored.entraObjectId).toBe("local-dev");
    expect(stored.firstSignInAt).not.toBeNull();
  });

  it("rejects a DEACTIVATED user even though the identity matches", async () => {
    const email = `deactivated-${suffix}@example.com`;
    await seedUser({ email, status: "DEACTIVATED", entraObjectId: "local-dev" });

    process.env.LOCAL_DEV_EMAIL = email;
    const guard = new EntraAuthGuard();
    await expect(guard.canActivate(fakeContext())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("does not link an email that exists but was already DEACTIVATED before ever signing in", async () => {
    const email = `deactivated-preinvite-${suffix}@example.com`;
    const user = await seedUser({ email, status: "DEACTIVATED", entraObjectId: null });

    process.env.LOCAL_DEV_EMAIL = email;
    const guard = new EntraAuthGuard();
    await expect(guard.canActivate(fakeContext())).rejects.toBeInstanceOf(ForbiddenException);

    const stored = await withPlatformStaffContext((tx) => tx.user.findUniqueOrThrow({ where: { id: user.id } }));
    expect(stored.entraObjectId).toBeNull();
    expect(stored.status).toBe("DEACTIVATED");
  });
});
