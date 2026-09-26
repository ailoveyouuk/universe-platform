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
    // dto.confirmedAgreementOnFile is validated @IsIn([true]) — it exists so
    // the caller affirmatively confirms the signed data sharing agreement is
    // on file, not so the API can decide anything from its value. Consent
    // itself is unconditional (see createOrganizationWithDefaultRoles) — this
    // is a UI/audit gate on the platform-staff member creating the org, not a
    // second consent mechanism.
    const org = await createOrganizationWithDefaultRoles({ ...dto, acceptedById: caller.id });
    // Prisma only knows org.status/type as plain `string` columns (no native
    // enums on SQL Server) — narrowed here since the database only ever
    // stores one of the allowed values (packages/db/src/enums.ts).
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status as OrganizationSummary["status"],
      type: org.type as OrganizationSummary["type"],
      logoUrl: org.logoUrl,
    };
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
    return orgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      status: o.status as OrganizationSummary["status"],
      type: o.type as OrganizationSummary["type"],
      logoUrl: o.logoUrl,
    }));
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
