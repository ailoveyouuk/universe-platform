import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@universe/db";
import type { UserSummary } from "@universe/types";
import { assertCanManageOrg } from "../common/authorization";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { InviteUserDto } from "./dto/invite-user.dto";
import { recordFieldChanges } from "../common/audit-log";

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

const include = {
  organization: true,
  userRoles: { include: { role: true } },
} as const;

@Injectable()
export class UsersService {
  /**
   * The Admin app's core action: pre-create a User row for someone who has
   * never touched Universe, with their organization and role(s) already
   * assigned. See EntraAuthGuard for what happens when they actually sign
   * in for the first time.
   */
  async invite(caller: RequestUser, dto: InviteUserDto): Promise<UserSummary> {
    assertCanManageOrg(caller, dto.organizationId, "org.users.manage");

    const existing = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`${dto.email} has already been added to Universe.`);
    }

    const roles = await prisma.role.findMany({ where: { id: { in: dto.roleIds } } });
    if (roles.length !== dto.roleIds.length) {
      throw new BadRequestException("One or more roles were not found.");
    }
    const foreignRole = roles.find((r) => r.organizationId && r.organizationId !== dto.organizationId);
    if (foreignRole) {
      throw new BadRequestException(`Role "${foreignRole.name}" does not belong to the target organisation.`);
    }

    const created = await prisma.user.create({
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

    return toSummary(created);
  }

  /**
   * Platform staff see every organization's users (optionally filtered);
   * everyone else only ever sees their own organization's users, regardless
   * of what's passed in organizationId — never trust a client-supplied
   * organization filter over the caller's own tenant.
   */
  async findAll(caller: RequestUser, organizationId?: string): Promise<UserSummary[]> {
    const scopedOrgId = caller.platformStaffRole !== "NONE" ? organizationId : caller.organizationId;

    if (caller.platformStaffRole === "NONE" && !caller.permissions.includes("org.users.manage")) {
      // Non-admins can still see themselves, nothing else.
      const self = await prisma.user.findUnique({ where: { id: caller.id }, include });
      return self ? [toSummary(self)] : [];
    }

    const users = await prisma.user.findMany({
      where: scopedOrgId ? { organizationId: scopedOrgId } : undefined,
      include,
      orderBy: { invitedAt: "desc" },
    });
    return users.map(toSummary);
  }

  /** Gap 9 (compliance-standards-gap-analysis.md) — ISO 27001-style access
   * review trail: deactivating a user is an access-control change, so it's
   * logged through the same generic FieldChangeLog every other audited
   * write uses, not left as a bare status flip with only `updatedAt` to
   * show for it. Wrapped in its own prisma.$transaction (this service
   * doesn't run through withTenantContext at all today — a pre-existing
   * gap, see azure-infra-notes.md — so this is the narrowest fix that
   * still keeps the status update and its log entry atomic with each
   * other). */
  async deactivate(caller: RequestUser, id: string): Promise<UserSummary> {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException(`User ${id} not found`);

    assertCanManageOrg(caller, target.organizationId, "org.users.manage");

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id },
        data: { status: "DEACTIVATED" },
        include,
      });
      await recordFieldChanges(tx, {
        organizationId: target.organizationId,
        tableName: "users",
        recordId: id,
        changedById: caller.id,
        changes: [{ field: "status", oldValue: target.status, newValue: "DEACTIVATED" }],
        source: "API",
      });
      return result;
    });
    return toSummary(updated);
  }

  /**
   * Replaces a user's whole role set — added 2026-10-08 so an org admin can
   * grant an existing user the new "Quality Assurance"/"Responsible Person"
   * roles (or any other role) without having to deactivate and re-invite
   * them, which invite() can't do for an email that's already in the
   * system. Same permission as invite/deactivate: org.users.manage, own
   * organisation only (platform staff exempted via assertCanManageOrg).
   */
  async updateRoles(caller: RequestUser, id: string, roleIds: string[]): Promise<UserSummary> {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException(`User ${id} not found`);

    assertCanManageOrg(caller, target.organizationId, "org.users.manage");

    const roles = await prisma.role.findMany({ where: { id: { in: roleIds } } });
    if (roles.length !== roleIds.length) {
      throw new BadRequestException("One or more roles were not found.");
    }
    const foreignRole = roles.find((r) => r.organizationId && r.organizationId !== target.organizationId);
    if (foreignRole) {
      throw new BadRequestException(`Role "${foreignRole.name}" does not belong to this user's organisation.`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const before = await tx.userRole.findMany({ where: { userId: id }, include: { role: true } });
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (roleIds.length) {
        await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) });
      }
      const result = await tx.user.update({ where: { id }, data: {}, include });
      await recordFieldChanges(tx, {
        organizationId: target.organizationId,
        tableName: "users",
        recordId: id,
        changedById: caller.id,
        changes: [
          {
            field: "roles",
            oldValue: before.map((ur) => ur.role.name).join(", ") || null,
            newValue: roles.map((r) => r.name).join(", ") || null,
          },
        ],
        source: "API",
      });
      return result;
    });
    return toSummary(updated);
  }
}
