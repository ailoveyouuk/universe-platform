import { Injectable } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withTenantContext, withPlatformStaffContext } from "@universe/db";
import type { OrganizationSummary, RoleSummary, DataSharingConsentSummary } from "@universe/types";
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
      primaryColor: org.primaryColor,
      secondaryColor: org.secondaryColor,
      countryOfRegistrationCode: org.countryOfRegistrationCode,
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
      primaryColor: o.primaryColor,
      secondaryColor: o.secondaryColor,
      countryOfRegistrationCode: o.countryOfRegistrationCode,
    }));
  }

  /** Roles available to assign within one organization — used by the Admin
   * app's role picker on the invite form.
   *
   * Fixed 2026-10-14: this previously queried `prisma.role.findMany`
   * directly, with no withTenantContext/withPlatformStaffContext call
   * around it at all. `roles` IS row-level-security-protected (see
   * row-level-security.sql) and RLS here defaults to DENY with no
   * session context set — so this call would always have returned an
   * empty array for any real tenant role, regardless of what
   * assertCanManageOrg allowed. Found incidentally while wiring up
   * DataSharingConsent below (same file, same missing-context class of
   * bug). Platform staff get withPlatformStaffContext (they may be
   * managing an org that isn't their own, which assertCanManageOrg
   * already permits); everyone else gets withTenantContext scoped to
   * the target org, which assertCanManageOrg has already confirmed is
   * their own. */
  async findRoles(caller: RequestUser, organizationId: string): Promise<RoleSummary[]> {
    assertCanManageOrg(caller, organizationId, "org.users.manage");
    const runInContext = caller.platformStaffRole !== "NONE" ? withPlatformStaffContext : (fn: any) => withTenantContext(organizationId, fn);
    const roles = await runInContext((tx: any) =>
      tx.role.findMany({
        where: { organizationId },
        orderBy: { name: "asc" },
      }),
    );
    return roles.map((r: any) => ({ id: r.id, name: r.name, appScope: r.appScope }));
  }

  /** DataSharingConsent is one-to-one with Organization, auto-created and
   * unconditional at provisioning (see that model's own schema.prisma doc
   * comment and CURRENT_DATA_SHARING_TERMS_VERSION/DEFAULT_DATA_SHARING_
   * SCOPE in organizations.ts) — this is a read-only "what's on file for
   * this org" endpoint, not a toggle. Same RLS-context requirement/fix as
   * findRoles above: data_sharing_consents is RLS-protected, so this must
   * run inside a context that sets organizationId or isPlatformStaff. */
  async getDataSharingConsent(caller: RequestUser, organizationId: string): Promise<DataSharingConsentSummary | null> {
    assertCanManageOrg(caller, organizationId, "org.users.manage");
    const runInContext = caller.platformStaffRole !== "NONE" ? withPlatformStaffContext : (fn: any) => withTenantContext(organizationId, fn);
    const row = await runInContext((tx: any) =>
      tx.dataSharingConsent.findUnique({
        where: { organizationId },
        include: { acceptedBy: { select: { forename: true, surname: true } } },
      }),
    );
    if (!row) return null;
    return {
      organizationId: row.organizationId,
      scope: JSON.parse(row.scope || "[]"),
      termsVersion: row.termsVersion,
      acceptedById: row.acceptedById,
      acceptedByName: row.acceptedBy ? `${row.acceptedBy.forename} ${row.acceptedBy.surname}` : null,
      acceptedAt: row.acceptedAt.toISOString(),
      revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    };
  }
}
