import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { withPlatformStaffContext, withTenantContext } from "@universe/db";
import type { UserDetail, UserSummary } from "@universe/types";
import { assertCanManageOrg } from "../common/authorization";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { InviteUserDto } from "./dto/invite-user.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";

function toSummary(u: {
  id: string;
  email: string;
  forename: string;
  surname: string;
  status: string;
  organizationId: string;
  organization: { name: string };
  userRoles: { role: { id: string; name: string } }[];
  invitedAt: Date;
  firstSignInAt: Date | null;
}): UserSummary {
  return {
    id: u.id,
    email: u.email,
    forename: u.forename,
    surname: u.surname,
    status: u.status as UserSummary["status"],
    organizationId: u.organizationId,
    organizationName: u.organization.name,
    roleNames: u.userRoles.map((ur) => ur.role.name),
    roleIds: u.userRoles.map((ur) => ur.role.id),
    invitedAt: u.invitedAt.toISOString(),
    firstSignInAt: u.firstSignInAt?.toISOString() ?? null,
  };
}

function toDetail(u: any): UserDetail {
  return {
    ...toSummary(u),
    jobTitle: u.jobTitle ?? null,
    platformStaffRole: u.platformStaffRole as UserDetail["platformStaffRole"],
    linkedToIdentity: !!u.entraObjectId,
    invitedByName: u.invitedBy ? `${u.invitedBy.forename} ${u.invitedBy.surname}` : null,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

const include = {
  organization: true,
  userRoles: { include: { role: true } },
  invitedBy: { select: { forename: true, surname: true } },
} as const;

/**
 * RLS note (2026-10-16): users, roles, user_roles' parent rows and
 * field_change_log are all row-level-security protected, so every query here
 * runs inside withTenantContext / withPlatformStaffContext. Before this, the
 * service used the bare `prisma` client, which RLS default-denies.
 * - Platform staff: withPlatformStaffContext (cross-tenant by design).
 * - Everyone else: withTenantContext(own org) — so looking up a user id that
 *   belongs to another tenant simply finds nothing (404), never a 403 that
 *   would confirm the id exists.
 */
type Tx = any;
function runAs<T>(caller: RequestUser, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(caller.organizationId, fn);
}

@Injectable()
export class UsersService {
  private async loadTarget(caller: RequestUser, tx: Tx, id: string) {
    const target = await tx.user.findUnique({ where: { id }, include });
    if (!target) throw new NotFoundException(`User ${id} not found`);
    assertCanManageOrg(caller, target.organizationId, "org.users.manage");
    return target;
  }

  /**
   * The Admin app's core action: pre-create a User row for someone who has
   * never touched Universe, with their organization and role(s) already
   * assigned. See EntraAuthGuard for what happens when they actually sign
   * in for the first time.
   */
  async invite(caller: RequestUser, dto: InviteUserDto): Promise<UserSummary> {
    assertCanManageOrg(caller, dto.organizationId, "org.users.manage");

    // Email is unique across ALL tenants, so the existence check has to be
    // cross-tenant (platform-context, existence only — nothing is returned).
    const existing = await withPlatformStaffContext((tx: Tx) => tx.user.findUnique({ where: { email: dto.email }, select: { id: true } }));
    if (existing) {
      throw new ConflictException(`${dto.email} has already been added to Universe.`);
    }

    return runAs(caller, async (tx) => {
      const roles = await tx.role.findMany({ where: { id: { in: dto.roleIds } } });
      if (roles.length !== dto.roleIds.length) {
        throw new BadRequestException("One or more roles were not found.");
      }
      const foreignRole = roles.find((r: any) => r.organizationId && r.organizationId !== dto.organizationId);
      if (foreignRole) {
        throw new BadRequestException(`Role "${foreignRole.name}" does not belong to the target organisation.`);
      }
      const created = await tx.user.create({
        data: {
          email: dto.email,
          forename: dto.forename,
          surname: dto.surname,
          organizationId: dto.organizationId,
          invitedById: caller.id,
          userRoles: { create: dto.roleIds.map((roleId) => ({ roleId })) },
        },
        include,
      });
      await recordFieldChanges(tx, {
        organizationId: dto.organizationId,
        tableName: "users",
        recordId: created.id,
        changedById: caller.id,
        changes: [{ field: "status", oldValue: null, newValue: "INVITED" }],
        source: "API",
      });
      return toSummary(created);
    });
  }

  /**
   * Platform staff see every organization's users (optionally filtered);
   * everyone else only ever sees their own organization's users, regardless
   * of what's passed in organizationId — never trust a client-supplied
   * organization filter over the caller's own tenant.
   */
  async findAll(caller: RequestUser, organizationId?: string): Promise<UserSummary[]> {
    const scopedOrgId = caller.platformStaffRole !== "NONE" ? organizationId : caller.organizationId;
    const canManage = caller.platformStaffRole !== "NONE" || caller.permissions.includes("org.users.manage");

    return runAs(caller, async (tx) => {
      if (!canManage) {
        // Non-admins can still see themselves, nothing else.
        const self = await tx.user.findUnique({ where: { id: caller.id }, include });
        return self ? [toSummary(self)] : [];
      }
      const users = await tx.user.findMany({
        where: scopedOrgId ? { organizationId: scopedOrgId } : undefined,
        include,
        orderBy: { invitedAt: "desc" },
      });
      return users.map(toSummary);
    });
  }

  async findOne(caller: RequestUser, id: string): Promise<UserDetail> {
    return runAs(caller, async (tx) => toDetail(await this.loadTarget(caller, tx, id)));
  }

  /** Edit name / job title (org.users.manage on the user's org) and, for
   * platform staff, the user's platformStaffRole. Every change is audited. */
  async update(caller: RequestUser, id: string, dto: UpdateUserDto): Promise<UserDetail> {
    return runAs(caller, async (tx) => {
      const target = await this.loadTarget(caller, tx, id);

      if (dto.platformStaffRole !== undefined && dto.platformStaffRole !== target.platformStaffRole) {
        if (caller.platformStaffRole === "NONE") throw new ForbiddenException("Only platform staff can change a platform staff role.");
        if (caller.id === id) throw new ForbiddenException("You cannot change your own platform staff role.");
        const touchesSuperAdmin = dto.platformStaffRole === "SUPER_ADMIN" || target.platformStaffRole === "SUPER_ADMIN";
        if (touchesSuperAdmin && caller.platformStaffRole !== "SUPER_ADMIN") {
          throw new ForbiddenException("Only a SUPER_ADMIN can grant or revoke SUPER_ADMIN.");
        }
      }
      if (dto.forename === null || dto.surname === null) throw new BadRequestException("Names cannot be cleared.");

      const fields = ["forename", "surname", "jobTitle", "platformStaffRole"] as const;
      const changes = diffForAudit(target, dto, fields);
      if (changes.length === 0) return toDetail(target);
      const data: Record<string, unknown> = {};
      for (const c of changes) data[c.field] = (dto as any)[c.field];

      const updated = await tx.user.update({ where: { id }, data, include });
      await recordFieldChanges(tx, {
        organizationId: target.organizationId,
        tableName: "users",
        recordId: id,
        changedById: caller.id,
        changes,
        source: "API",
      });
      return toDetail(updated);
    });
  }

  /** Gap 9 (compliance-standards-gap-analysis.md) — ISO 27001-style access
   * review trail: deactivating a user is an access-control change, logged
   * through the generic FieldChangeLog. A caller cannot deactivate themselves. */
  async deactivate(caller: RequestUser, id: string): Promise<UserSummary> {
    if (caller.id === id) throw new BadRequestException("You cannot deactivate your own account.");
    return runAs(caller, async (tx) => {
      const target = await this.loadTarget(caller, tx, id);
      if (target.status === "DEACTIVATED") return toSummary(target);
      const result = await tx.user.update({ where: { id }, data: { status: "DEACTIVATED" }, include });
      await recordFieldChanges(tx, {
        organizationId: target.organizationId,
        tableName: "users",
        recordId: id,
        changedById: caller.id,
        changes: [{ field: "status", oldValue: target.status, newValue: "DEACTIVATED" }],
        source: "API",
      });
      return toSummary(result);
    });
  }

  /** Restores a deactivated user: back to ACTIVE if they had already signed
   * in and been linked to their identity, otherwise back to INVITED so the
   * normal first-sign-in link still happens. Audited. */
  async reactivate(caller: RequestUser, id: string): Promise<UserSummary> {
    return runAs(caller, async (tx) => {
      const target = await this.loadTarget(caller, tx, id);
      if (target.status !== "DEACTIVATED") throw new BadRequestException("Only a deactivated user can be reactivated.");
      const next = target.entraObjectId ? "ACTIVE" : "INVITED";
      const result = await tx.user.update({ where: { id }, data: { status: next }, include });
      await recordFieldChanges(tx, {
        organizationId: target.organizationId,
        tableName: "users",
        recordId: id,
        changedById: caller.id,
        changes: [{ field: "status", oldValue: "DEACTIVATED", newValue: next }],
        source: "API",
      });
      return toSummary(result);
    });
  }

  /**
   * Replaces a user's whole role set — so an org admin can grant an existing
   * user a role without deactivating and re-inviting them. Same permission as
   * invite/deactivate: org.users.manage, own organisation only.
   */
  async updateRoles(caller: RequestUser, id: string, roleIds: string[]): Promise<UserSummary> {
    return runAs(caller, async (tx) => {
      const target = await this.loadTarget(caller, tx, id);

      const roles = await tx.role.findMany({ where: { id: { in: roleIds } } });
      if (roles.length !== roleIds.length) {
        throw new BadRequestException("One or more roles were not found.");
      }
      const foreignRole = roles.find((r: any) => r.organizationId && r.organizationId !== target.organizationId);
      if (foreignRole) {
        throw new BadRequestException(`Role "${foreignRole.name}" does not belong to this user's organisation.`);
      }

      const before = await tx.userRole.findMany({ where: { userId: id }, include: { role: true } });
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (roleIds.length) {
        await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) });
      }
      const result = await tx.user.findUnique({ where: { id }, include });
      await recordFieldChanges(tx, {
        organizationId: target.organizationId,
        tableName: "users",
        recordId: id,
        changedById: caller.id,
        changes: [
          {
            field: "roles",
            oldValue: before.map((ur: any) => ur.role.name).join(", ") || null,
            newValue: roles.map((r: any) => r.name).join(", ") || null,
          },
        ],
        source: "API",
      });
      return toSummary(result);
    });
  }

  /** "Reset account": unlinks the user's Entra identity so the next sign-in
   * with the invited email re-links cleanly (e.g. they moved to a new
   * Microsoft account or a sign-in got stuck). Universe has no passwords of
   * its own, so this is the reset that exists. The user's existing sessions
   * stop working on their next request, because the guard resolves users by
   * identity. Roles and history are untouched. Deactivated users must be
   * reactivated first. Audited. */
  async resetSignIn(caller: RequestUser, id: string): Promise<UserSummary> {
    if (caller.id === id) throw new BadRequestException("You cannot reset your own sign-in.");
    return runAs(caller, async (tx) => {
      const target = await this.loadTarget(caller, tx, id);
      if (target.status === "DEACTIVATED") throw new BadRequestException("Reactivate this user before resetting their sign-in.");
      if (!target.entraObjectId && target.status === "INVITED") return toSummary(target);
      const result = await tx.user.update({
        where: { id },
        data: { entraObjectId: null, firstSignInAt: null, status: "INVITED" },
        include,
      });
      await recordFieldChanges(tx, {
        organizationId: target.organizationId,
        tableName: "users",
        recordId: id,
        changedById: caller.id,
        changes: [
          { field: "status", oldValue: target.status, newValue: "INVITED" },
          { field: "identityLinked", oldValue: target.entraObjectId ? "true" : "false", newValue: "false" },
        ],
        reason: "Sign-in reset",
        source: "API",
      });
      return toSummary(result);
    });
  }
}
