import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@universe/db";
import type { UserSummary } from "@universe/types";
import { assertCanManageOrg } from "../common/authorization";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { InviteUserDto } from "./dto/invite-user.dto";

function toSummary(u: {
  id: string;
  email: string;
  forename: string;
  surname: string;
  status: string;
  organizationId: string;
  organization: { name: string };
  userRoles: { role: { name: string } }[];
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
      throw new BadRequestException(`Role "${foreignRole.name}" does not belong to the target organization.`);
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

  async deactivate(caller: RequestUser, id: string): Promise<UserSummary> {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException(`User ${id} not found`);

    assertCanManageOrg(caller, target.organizationId, "org.users.manage");

    const updated = await prisma.user.update({
      where: { id },
      data: { status: "DEACTIVATED" },
      include,
    });
    return toSummary(updated);
  }
}
