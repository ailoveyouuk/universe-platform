import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { withPlatformStaffContext, withTenantContext } from "@universe/db";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertCanManageOrg } from "../common/authorization";
import { recordFieldChanges } from "../common/audit-log";

export interface OrganizationAccessItem {
  grantId: string;
  userId: string;
  name: string;
  email: string;
  homeOrganizationName: string;
  grantedBy: string | null;
  createdAt: string;
}
export interface OrganizationAccessList { isDemo: boolean; items: OrganizationAccessItem[] }

/**
 * Cross-organisation access for DEMO organisations (2026-10-21, requested by Lewis): an organisation's administrator adds an existing user's
 * email, and that person can then pick this organisation after sign-in (they keep their own permissions). Rules, all enforced here and again
 * by the sign-in guard on every request: the caller must manage users in THIS organisation; this organisation and the person's home
 * organisation must both be demo organisations; the person must be an active, non-simulated user. Real organisations can never be shared this
 * way. Each change is written to the audit history of the organisation.
 */
@Injectable()
export class OrganizationAccessService {
  async list(caller: RequestUser, organizationId: string): Promise<OrganizationAccessList> {
    assertCanManageOrg(caller, organizationId, "org.users.manage");
    return withPlatformStaffContext(async (tx) => {
      const org = await tx.organization.findUnique({ where: { id: organizationId }, select: { isDemo: true } });
      if (!org) throw new NotFoundException("Organisation not found.");
      if (!org.isDemo) return { isDemo: false, items: [] };
      const grants = await tx.userOrganizationAccess.findMany({
        where: { grantedOrganizationId: organizationId },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, forename: true, surname: true, email: true, organization: { select: { name: true } } } } },
      });
      return {
        isDemo: true,
        items: grants.map((g) => ({
          grantId: g.id, userId: g.user.id, name: [g.user.forename, g.user.surname].filter(Boolean).join(" ") || g.user.email, email: g.user.email,
          homeOrganizationName: g.user.organization.name, grantedBy: g.grantedBy, createdAt: g.createdAt.toISOString(),
        })),
      };
    });
  }

  async add(caller: RequestUser, organizationId: string, email: string): Promise<OrganizationAccessList> {
    assertCanManageOrg(caller, organizationId, "org.users.manage");
    const clean = email.trim().toLowerCase();
    const grant = await withPlatformStaffContext(async (tx) => {
      const org = await tx.organization.findUnique({ where: { id: organizationId }, select: { isDemo: true, status: true } });
      if (!org) throw new NotFoundException("Organisation not found.");
      if (!org.isDemo) throw new BadRequestException("Only demo organisations can share access with people from other organisations.");
      if (org.status === "SUSPENDED") throw new BadRequestException("This organisation is suspended.");
      const user = await tx.user.findFirst({ where: { email: clean }, select: { id: true, status: true, isSimulated: true, archivedAt: true, organizationId: true, organization: { select: { isDemo: true } } } });
      // One neutral message for every "cannot be added" reason, so the screen does not confirm who exists elsewhere.
      const cannot = "That email does not belong to an active user of a demo organisation, so it cannot be added.";
      if (!user || user.status !== "ACTIVE" || user.isSimulated || user.archivedAt || !user.organization.isDemo) throw new BadRequestException(cannot);
      if (user.organizationId === organizationId) throw new BadRequestException("That person already belongs to this organisation.");
      const existing = await tx.userOrganizationAccess.findFirst({ where: { userId: user.id, grantedOrganizationId: organizationId }, select: { id: true } });
      if (existing) throw new ConflictException("That person already has access.");
      return tx.userOrganizationAccess.create({ data: { userId: user.id, grantedOrganizationId: organizationId, grantedBy: caller.email } });
    });
    await withTenantContext(organizationId, (tx) => recordFieldChanges(tx, {
      organizationId, tableName: "user_organization_access", recordId: grant.id, changedById: caller.id,
      changes: [{ field: "access granted to", oldValue: null, newValue: clean }], source: "UI",
    }));
    return this.list(caller, organizationId);
  }

  async remove(caller: RequestUser, organizationId: string, grantId: string): Promise<OrganizationAccessList> {
    assertCanManageOrg(caller, organizationId, "org.users.manage");
    const removed = await withPlatformStaffContext(async (tx) => {
      const g = await tx.userOrganizationAccess.findFirst({ where: { id: grantId, grantedOrganizationId: organizationId }, include: { user: { select: { email: true } } } });
      if (!g) throw new NotFoundException("Access entry not found.");
      await tx.userOrganizationAccess.delete({ where: { id: g.id } });
      return g;
    });
    await withTenantContext(organizationId, (tx) => recordFieldChanges(tx, {
      organizationId, tableName: "user_organization_access", recordId: removed.id, changedById: caller.id,
      changes: [{ field: "access granted to", oldValue: removed.user.email, newValue: null }], source: "UI",
    }));
    return this.list(caller, organizationId);
  }
}
