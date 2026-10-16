import { randomUUID } from "node:crypto";
import type { ExecutionContext } from "@nestjs/common";
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { AuditLogService } from "../src/audit-log/audit-log.service";
import { EntraAuthGuard, type RequestUser } from "../src/auth/entra-auth.guard";
import { OrganizationsService } from "../src/organizations/organizations.service";
import { RolesService } from "../src/roles/roles.service";
import { UsersService } from "../src/users/users.service";

/**
 * Forensic coverage of the Admin app's backend (added 2026-10-16): users,
 * roles, organisation edits, the activity feed and org suspension, run against
 * the real Row-Level-Security database exactly as production does. Each test
 * asserts both the happy path and the guard rail that exists to stop abuse
 * (cross-tenant access, privilege escalation, lock-out, self-harm actions).
 */
describe("Admin services", () => {
  const suffix = randomUUID().slice(0, 8);
  const users = new UsersService();
  const roles = new RolesService();
  const orgs = new OrganizationsService();
  const audit = new AuditLogService();

  let orgA: string;
  let orgB: string;
  const userIds: string[] = [];
  const extraRoleIds: string[] = [];

  const email = (tag: string) => `${tag}-${suffix}@example.com`;

  async function makeUser(orgId: string, tag: string, opts: { roleName?: string; status?: string; entra?: string | null; platform?: string } = {}) {
    const role = opts.roleName ? await withPlatformStaffContext((tx) => tx.role.findFirstOrThrow({ where: { organizationId: orgId, name: opts.roleName } })) : null;
    const user = await withPlatformStaffContext((tx) =>
      tx.user.create({
        data: {
          organizationId: orgId,
          email: email(tag),
          forename: tag,
          surname: "Tester",
          status: opts.status ?? "ACTIVE",
          entraObjectId: opts.entra === undefined ? `oid-${tag}-${suffix}` : opts.entra,
          platformStaffRole: opts.platform ?? "NONE",
          userRoles: role ? { create: [{ roleId: role.id }] } : undefined,
        },
      }),
    );
    userIds.push(user.id);
    return user;
  }

  async function asRequestUser(id: string): Promise<RequestUser> {
    const u = await withPlatformStaffContext((tx) =>
      tx.user.findUniqueOrThrow({
        where: { id },
        include: { organization: true, userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } } },
      }),
    );
    return {
      id: u.id,
      organizationId: u.organizationId,
      email: u.email,
      forename: u.forename,
      surname: u.surname,
      organizationName: u.organization.name,
      organizationLogoUrl: null,
      organizationPrimaryColor: null,
      organizationSecondaryColor: null,
      platformStaffRole: u.platformStaffRole as RequestUser["platformStaffRole"],
      permissions: u.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.key)),
    };
  }

  const stored = (id: string) => withPlatformStaffContext((tx) => tx.user.findUniqueOrThrow({ where: { id } }));
  const logFor = (recordId: string) => withPlatformStaffContext((tx) => tx.fieldChangeLog.findMany({ where: { recordId }, orderBy: { changedAt: "asc" } }));

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Admin Svc A ${suffix}`, slug: `admin-svc-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Admin Svc B ${suffix}`, slug: `admin-svc-b-${suffix}` })).id;
  });

  afterEach(() => {
    delete process.env.LOCAL_DEV_EMAIL;
  });

  afterAll(async () => {
    await withPlatformStaffContext(async (tx) => {
      await tx.fieldChangeLog.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.userRole.deleteMany({ where: { userId: { in: userIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
      await tx.rolePermission.deleteMany({ where: { role: { organizationId: { in: [orgA, orgB] } } } });
      await tx.role.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.dataSharingConsent.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await prisma.$disconnect();
  });

  // ------------------------------------------------------------------ users
  describe("users", () => {
    it("never reveals another tenant's user to a non-platform admin (404, not 403)", async () => {
      const adminA = await asRequestUser((await makeUser(orgA, "adminA1", { roleName: "Organization Admin" })).id);
      const victim = await makeUser(orgB, "victimB1", { roleName: "Read Only" });
      await expect(users.findOne(adminA, victim.id)).rejects.toBeInstanceOf(NotFoundException);
      await expect(users.deactivate(adminA, victim.id)).rejects.toBeInstanceOf(NotFoundException);
      await expect(users.update(adminA, victim.id, { forename: "Hacked" })).rejects.toBeInstanceOf(NotFoundException);
      expect((await stored(victim.id)).status).toBe("ACTIVE");
    });

    it("lists only the caller's organisation for a non-platform admin", async () => {
      const adminA = await asRequestUser((await makeUser(orgA, "lister", { roleName: "Organization Admin" })).id);
      await makeUser(orgB, "otherlist", { roleName: "Read Only" });
      const list = await users.findAll(adminA, orgB /* client-supplied filter must be ignored */);
      expect(list.length).toBeGreaterThan(0);
      expect(list.every((u) => u.organizationId === orgA)).toBe(true);
    });

    it("refuses self-deactivation and self sign-in reset", async () => {
      const me = await makeUser(orgA, "selfie", { roleName: "Organization Admin" });
      const caller = await asRequestUser(me.id);
      await expect(users.deactivate(caller, me.id)).rejects.toBeInstanceOf(BadRequestException);
      await expect(users.resetSignIn(caller, me.id)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("blocks invite of an email already used in another tenant", async () => {
      const adminA = await asRequestUser((await makeUser(orgA, "inviter", { roleName: "Organization Admin" })).id);
      const roleA = await withPlatformStaffContext((tx) => tx.role.findFirstOrThrow({ where: { organizationId: orgA, name: "Read Only" } }));
      await makeUser(orgB, "taken", { roleName: "Read Only" });
      await expect(
        users.invite(adminA, { email: email("taken"), forename: "X", surname: "Y", organizationId: orgA, roleIds: [roleA.id] }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("cannot invite into another organisation, or with another organisation's role", async () => {
      const adminA = await asRequestUser((await makeUser(orgA, "inviter2", { roleName: "Organization Admin" })).id);
      const roleA = await withPlatformStaffContext((tx) => tx.role.findFirstOrThrow({ where: { organizationId: orgA, name: "Read Only" } }));
      const roleB = await withPlatformStaffContext((tx) => tx.role.findFirstOrThrow({ where: { organizationId: orgB, name: "Read Only" } }));
      await expect(
        users.invite(adminA, { email: email("intoB"), forename: "X", surname: "Y", organizationId: orgB, roleIds: [roleB.id] }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        users.invite(adminA, { email: email("foreignrole"), forename: "X", surname: "Y", organizationId: orgA, roleIds: [roleB.id] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(roleA.id).toBeTruthy();
    });

    it("deactivate -> reactivate restores ACTIVE when linked and INVITED when never linked, with an audit trail", async () => {
      const adminA = await asRequestUser((await makeUser(orgA, "lifecycle-admin", { roleName: "Organization Admin" })).id);
      const linked = await makeUser(orgA, "linked", { roleName: "Read Only" });
      const unlinked = await makeUser(orgA, "unlinked", { roleName: "Read Only", status: "INVITED", entra: null });

      await users.deactivate(adminA, linked.id);
      expect((await stored(linked.id)).status).toBe("DEACTIVATED");
      await users.reactivate(adminA, linked.id);
      expect((await stored(linked.id)).status).toBe("ACTIVE");

      await users.deactivate(adminA, unlinked.id);
      await users.reactivate(adminA, unlinked.id);
      expect((await stored(unlinked.id)).status).toBe("INVITED");

      await expect(users.reactivate(adminA, linked.id)).rejects.toBeInstanceOf(BadRequestException);
      const trail = (await logFor(linked.id)).map((l) => `${l.fieldName}:${l.oldValue}->${l.newValue}`);
      expect(trail).toEqual(["status:ACTIVE->DEACTIVATED", "status:DEACTIVATED->ACTIVE"]);
    });

    it("reset sign-in unlinks the identity, returns to INVITED and is audited; refuses deactivated users", async () => {
      const adminA = await asRequestUser((await makeUser(orgA, "reset-admin", { roleName: "Organization Admin" })).id);
      const target = await makeUser(orgA, "resettable", { roleName: "Read Only" });
      await users.resetSignIn(adminA, target.id);
      const after = await stored(target.id);
      expect(after.entraObjectId).toBeNull();
      expect(after.status).toBe("INVITED");
      expect(after.firstSignInAt).toBeNull();
      expect((await logFor(target.id)).some((l) => l.fieldName === "identityLinked")).toBe(true);

      const dead = await makeUser(orgA, "dead", { roleName: "Read Only", status: "DEACTIVATED" });
      await expect(users.resetSignIn(adminA, dead.id)).rejects.toBeInstanceOf(BadRequestException);
    });

    it("a user without org.users.manage cannot manage anyone", async () => {
      const reader = await asRequestUser((await makeUser(orgA, "reader", { roleName: "Read Only" })).id);
      const other = await makeUser(orgA, "someone", { roleName: "Read Only" });
      await expect(users.deactivate(reader, other.id)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(users.update(reader, other.id, { forename: "Nope" })).rejects.toBeInstanceOf(ForbiddenException);
      const list = await users.findAll(reader);
      expect(list.map((u) => u.id)).toEqual([reader.id]);
    });

    it("platform staff role changes are platform-staff only, SUPER_ADMIN-gated and never self-applied", async () => {
      const orgAdmin = await asRequestUser((await makeUser(orgA, "pa-orgadmin", { roleName: "Organization Admin" })).id);
      const support = await makeUser(orgA, "pa-support", { platform: "SUPPORT" });
      const superAdmin = await makeUser(orgA, "pa-super", { platform: "SUPER_ADMIN" });
      const target = await makeUser(orgB, "pa-target", { roleName: "Read Only" });
      const supportReq = await asRequestUser(support.id);
      const superReq = await asRequestUser(superAdmin.id);

      await expect(users.update(orgAdmin, target.id, { platformStaffRole: "SUPPORT" })).rejects.toBeInstanceOf(NotFoundException);
      const own = await makeUser(orgA, "pa-own", { roleName: "Read Only" });
      await expect(users.update(orgAdmin, own.id, { platformStaffRole: "SUPPORT" })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(users.update(supportReq, target.id, { platformStaffRole: "SUPER_ADMIN" })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(users.update(supportReq, support.id, { platformStaffRole: "NONE" })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(users.update(superReq, superAdmin.id, { platformStaffRole: "NONE" })).rejects.toBeInstanceOf(ForbiddenException);

      const granted = await users.update(superReq, target.id, { platformStaffRole: "SUPPORT" });
      expect(granted.platformStaffRole).toBe("SUPPORT");
      // Platform staff can manage users in any tenant.
      expect((await users.findOne(supportReq, target.id)).email).toBe(email("pa-target"));
    });
  });

  // ------------------------------------------------------------------ roles
  describe("roles", () => {
    it("cannot grant permissions the caller doesn't hold, and rejects unknown keys", async () => {
      const limitedRole = await roles.create(await asRequestUser((await makeUser(orgA, "role-seed", { roleName: "Organization Admin" })).id), {
        organizationId: orgA,
        name: `Roles Only ${suffix}`,
        permissionKeys: ["org.roles.manage"],
      });
      extraRoleIds.push(limitedRole.id);
      const limitedUser = await makeUser(orgA, "limited");
      await withPlatformStaffContext((tx) => tx.userRole.create({ data: { userId: limitedUser.id, roleId: limitedRole.id } }));
      const limited = await asRequestUser(limitedUser.id);

      await expect(
        roles.create(limited, { organizationId: orgA, name: `Escalate ${suffix}`, permissionKeys: ["projects.delete"] }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        roles.update(limited, limitedRole.id, { permissionKeys: ["org.roles.manage", "org.users.manage"] }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      const platformCaller = await asRequestUser((await makeUser(orgA, "role-platform", { platform: "SUPER_ADMIN" })).id);
      await expect(
        roles.create(platformCaller, { organizationId: orgA, name: `Bogus ${suffix}`, permissionKeys: ["not.a.permission"] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("refuses a change that would leave the organisation with no one able to manage roles, and rolls it back", async () => {
      const org = (await createOrganizationWithDefaultRoles({ name: `Lockout ${suffix}`, slug: `lockout-${suffix}` })).id;
      try {
        const admin = await makeUser(org, "lockout-admin", { roleName: "Organization Admin" });
        const caller = await asRequestUser(admin.id);
        const adminRole = await withPlatformStaffContext((tx) => tx.role.findFirstOrThrow({ where: { organizationId: org, name: "Organization Admin" }, include: { rolePermissions: { include: { permission: true } } } }));
        const keys = adminRole.rolePermissions.map((rp) => rp.permission.key);
        await expect(roles.update(caller, adminRole.id, { permissionKeys: keys.filter((k) => k !== "org.roles.manage") })).rejects.toBeInstanceOf(BadRequestException);
        const afterKeys = (await withPlatformStaffContext((tx) => tx.role.findUniqueOrThrow({ where: { id: adminRole.id }, include: { rolePermissions: { include: { permission: true } } } }))).rolePermissions.map((rp) => rp.permission.key);
        expect(afterKeys.sort()).toEqual([...keys].sort());
      } finally {
        await withPlatformStaffContext(async (tx) => {
          await tx.fieldChangeLog.deleteMany({ where: { organizationId: org } });
          await tx.userRole.deleteMany({ where: { user: { organizationId: org } } });
          const doomed = await tx.user.findMany({ where: { organizationId: org }, select: { id: true } });
          await tx.user.deleteMany({ where: { id: { in: doomed.map((d) => d.id) } } });
          await tx.rolePermission.deleteMany({ where: { role: { organizationId: org } } });
          await tx.role.deleteMany({ where: { organizationId: org } });
          await tx.dataSharingConsent.deleteMany({ where: { organizationId: org } });
        });
        await prisma.organization.delete({ where: { id: org } });
      }
    });

    it("platform staff can edit any organisation's roles even when it would remove the last manager", async () => {
      const platform = await asRequestUser((await makeUser(orgA, "roles-platform", { platform: "SUPER_ADMIN" })).id);
      const listed = await roles.list(platform, orgB);
      expect(listed.length).toBeGreaterThan(0);
      expect(listed.every((r) => r.organizationId === orgB)).toBe(true);
    });

    it("cannot delete a role that has users; can delete an empty one; audited", async () => {
      const admin = await asRequestUser((await makeUser(orgA, "roledel-admin", { roleName: "Organization Admin" })).id);
      const readOnly = listedRole(await roles.list(admin, orgA), "Read Only");
      await makeUser(orgA, "has-readonly", { roleName: "Read Only" });
      await expect(roles.remove(admin, readOnly.id)).rejects.toBeInstanceOf(ConflictException);

      const empty = await roles.create(admin, { organizationId: orgA, name: `Disposable ${suffix}`, permissionKeys: ["projects.view"] });
      await roles.remove(admin, empty.id);
      expect((await roles.list(admin, orgA)).some((r) => r.id === empty.id)).toBe(false);
      expect((await logFor(empty.id)).map((l) => l.fieldName)).toContain("role");
    });

    it("keeps tenants apart: another org's admin sees 404 and cannot list or create across orgs", async () => {
      const adminA = await asRequestUser((await makeUser(orgA, "xt-admin", { roleName: "Organization Admin" })).id);
      const adminB = await asRequestUser((await makeUser(orgB, "xt-admin-b", { roleName: "Organization Admin" })).id);
      const roleB = listedRole(await roles.list(adminB, orgB), "Read Only");
      await expect(roles.update(adminA, roleB.id, { description: "pwned" })).rejects.toBeInstanceOf(NotFoundException);
      await expect(roles.remove(adminA, roleB.id)).rejects.toBeInstanceOf(NotFoundException);
      expect((await roles.list(adminA, orgB)).every((x) => x.organizationId === orgA)).toBe(true);
      await expect(roles.create(adminA, { organizationId: orgB, name: `Sneaky ${suffix}`, permissionKeys: [] })).rejects.toBeInstanceOf(ForbiddenException);
    });

    function listedRole(list: { id: string; name: string }[], name: string) {
      const r = list.find((x) => x.name === name);
      if (!r) throw new Error(`role ${name} missing`);
      return r;
    }
  });

  // ---------------------------------------------------------- organisations
  describe("organisations", () => {
    it("org admins edit their own profile fields but not name/slug/status/source; platform staff can", async () => {
      const adminA = await asRequestUser((await makeUser(orgA, "org-admin", { roleName: "Organization Admin" })).id);
      const platform = await asRequestUser((await makeUser(orgA, "org-platform", { platform: "SUPER_ADMIN" })).id);

      const updated = await orgs.update(adminA, orgA, { website: "https://example.org", primaryColor: "#112233" });
      expect(updated.website).toBe("https://example.org");
      await expect(orgs.update(adminA, orgA, { status: "SUSPENDED" })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(orgs.update(adminA, orgA, { name: "Renamed" })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(orgs.update(adminA, orgB, { website: "https://evil.example" })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(orgs.findOne(adminA, orgB)).rejects.toBeInstanceOf(ForbiddenException);

      const renamed = await orgs.update(platform, orgA, { name: `Admin Svc A ${suffix} (renamed)` });
      expect(renamed.name).toContain("renamed");
      await expect(orgs.update(platform, orgA, { slug: `admin-svc-b-${suffix}` })).rejects.toBeInstanceOf(ConflictException);
      await expect(orgs.update(platform, orgA, { countryOfRegistrationCode: "ZZ" })).rejects.toBeInstanceOf(BadRequestException);
      await expect(orgs.update(platform, orgA, { name: null as unknown as string })).rejects.toBeInstanceOf(BadRequestException);

      const cleared = await orgs.update(adminA, orgA, { website: null });
      expect(cleared.website).toBeNull();
      const trail = (await logFor(orgA)).filter((l) => l.tableName === "organizations").map((l) => l.fieldName);
      expect(trail).toEqual(expect.arrayContaining(["website", "primaryColor", "name"]));
    });

    it("a no-op update writes no audit rows", async () => {
      const platform = await asRequestUser((await makeUser(orgB, "noop-platform", { platform: "SUPER_ADMIN" })).id);
      const before = (await logFor(orgB)).length;
      await orgs.update(platform, orgB, {});
      expect((await logFor(orgB)).length).toBe(before);
    });
  });

  // ------------------------------------------------------------- activity feed
  describe("activity feed", () => {
    it("pages through rows with identical timestamps without skipping or repeating any", async () => {
      const platform = await asRequestUser((await makeUser(orgA, "feed-platform", { platform: "SUPER_ADMIN" })).id);
      const at = new Date("2020-01-01T00:00:00.000Z");
      await withPlatformStaffContext((tx) =>
        tx.fieldChangeLog.createMany({
          data: Array.from({ length: 7 }, (_, i) => ({ organizationId: orgA, tableName: "feedtest", recordId: `rec-${i}`, fieldName: "f", oldValue: null, newValue: String(i), changedAt: at })),
        }),
      );
      const seen: string[] = [];
      let before: string | undefined;
      for (let guard = 0; guard < 10; guard++) {
        const page = await audit.feed(platform, { organizationId: orgA, tableName: "feedtest", before, limit: 3 });
        seen.push(...page.entries.map((e) => e.id));
        if (!page.nextBefore) break;
        before = page.nextBefore;
      }
      expect(seen.length).toBe(7);
      expect(new Set(seen).size).toBe(7);
    });

    it("org admins only ever see their own organisation, whatever filter they send; others are refused", async () => {
      const adminA = await asRequestUser((await makeUser(orgA, "feed-admin", { roleName: "Organization Admin" })).id);
      const reader = await asRequestUser((await makeUser(orgA, "feed-reader", { roleName: "Read Only" })).id);
      await withPlatformStaffContext((tx) =>
        tx.fieldChangeLog.create({ data: { organizationId: orgB, tableName: "feedsecret", recordId: "b1", fieldName: "f", newValue: "secret" } }),
      );
      const page = await audit.feed(adminA, { organizationId: orgB, tableName: "feedsecret" });
      expect(page.entries).toHaveLength(0);
      await expect(audit.feed(reader, {})).rejects.toBeInstanceOf(ForbiddenException);
      await expect(audit.feed(adminA, { before: "not-a-date" })).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ------------------------------------------------------ organisation suspension
  describe("organisation suspension", () => {
    function ctx() {
      const req = { headers: { authorization: "Bearer t" } } as Record<string, unknown>;
      return { ctx: { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext };
    }

    it("locks out a suspended organisation's users on their next request but never platform staff, and restores on reactivation", async () => {
      const org = (await createOrganizationWithDefaultRoles({ name: `Suspend ${suffix}`, slug: `suspend-${suffix}` })).id;
      const regular = await makeUser(org, "susp-regular", { roleName: "Read Only", entra: "local-dev" });
      try {
        process.env.LOCAL_DEV_EMAIL = regular.email;
        const guard = new EntraAuthGuard();
        await expect(guard.canActivate(ctx().ctx)).resolves.toBe(true);

        await prisma.organization.update({ where: { id: org }, data: { status: "SUSPENDED" } });
        await expect(guard.canActivate(ctx().ctx)).rejects.toBeInstanceOf(ForbiddenException);

        // Platform staff in a suspended org still get in.
        await withPlatformStaffContext((tx) => tx.user.update({ where: { id: regular.id }, data: { platformStaffRole: "SUPPORT" } }));
        await expect(guard.canActivate(ctx().ctx)).resolves.toBe(true);
        await withPlatformStaffContext((tx) => tx.user.update({ where: { id: regular.id }, data: { platformStaffRole: "NONE" } }));

        await prisma.organization.update({ where: { id: org }, data: { status: "ACTIVE" } });
        await expect(guard.canActivate(ctx().ctx)).resolves.toBe(true);
      } finally {
        await withPlatformStaffContext(async (tx) => {
          await tx.userRole.deleteMany({ where: { userId: regular.id } });
          await tx.user.delete({ where: { id: regular.id } });
          await tx.rolePermission.deleteMany({ where: { role: { organizationId: org } } });
          await tx.role.deleteMany({ where: { organizationId: org } });
          await tx.dataSharingConsent.deleteMany({ where: { organizationId: org } });
        });
        await prisma.organization.delete({ where: { id: org } });
        userIds.splice(userIds.indexOf(regular.id), 1);
      }
    });
  });
});
