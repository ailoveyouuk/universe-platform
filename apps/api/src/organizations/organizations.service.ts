import { Injectable } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma } from "@universe/db";
import type { OrganizationSummary, RoleSummary } from "@universe/types";
import { assertPlatformStaff, assertCanManageOrg } from "../common/authorization";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { CreateOrganizationDto } from "./dto/create-organization.dto";

@Injectable()
export class OrganizationsService {
  /**
   * Onboarding is platform-operator-provisioned only during the pilot (see
   * architecture doc) — creating a new tenant organization is platform-staff
   * only, full stop. There is no "org admin creates their own org" path.
   */
  async create(caller: RequestUser, dto: CreateOrganizationDto): Promise<OrganizationSummary> {
    assertPlatformStaff(caller);
    const org = await createOrganizationWithDefaultRoles(dto);
    return { id: org.id, name: org.name, slug: org.slug, status: org.status };
  }

  /**
   * Platform staff see every organization (needed for the Admin app's org
   * picker when inviting a user into any tenant). Everyone else sees only
   * their own — enough for an org admin inviting within their own org,
   * never enough to browse other tenants.
   */
  async findAll(caller: RequestUser): Promise<OrganizationSummary[]> {
    const orgs = await prisma.organization.findMany({
      where: caller.platformStaffRole !== "NONE" ? undefined : { id: caller.organizationId },
      orderBy: { name: "asc" },
    });
    return orgs.map((o) => ({ id: o.id, name: o.name, slug: o.slug, status: o.status }));
  }

  /** Roles available to assign within one organization — used by the Admin
   * app's role picker on the invite form. */
  async findRoles(caller: RequestUser, organizationId: string): Promise<RoleSummary[]> {
    assertCanManageOrg(caller, organizationId, "org.users.manage");
    const roles = await prisma.role.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
    return roles.map((r) => ({ id: r.id, name: r.name, appScope: r.appScope }));
  }
}
