import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withTenantContext, withPlatformStaffContext } from "@universe/db";
import type {
  OrganizationSummary,
  OrganizationDetail,
  SupportContact,
  RoleSummary,
  DataSharingConsentSummary,
  OrganizationCountryPresenceSummary,
  ProcurementAgentProfileSummary,
  TenderingBodyProfileSummary,
  OrganizationManufacturerSiteSummary,
  FunderProfileSummary,
  DataInsightsUserProfileSummary,
} from "@universe/types";
import { assertPlatformStaff, assertCanManageOrg } from "../common/authorization";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { CreateOrganizationDto } from "./dto/create-organization.dto";
import type { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
import type { SetOrganizationCountryPresenceDto } from "./dto/set-country-presence.dto";
import type {
  UpsertProcurementAgentProfileDto,
  UpsertTenderingBodyProfileDto,
  UpsertFunderProfileDto,
  UpsertDataInsightsUserProfileDto,
  AddManufacturerSiteDto,
} from "./dto/org-type-profiles.dto";

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
  async findAll(caller: RequestUser, includeSimulated = false): Promise<OrganizationSummary[]> {
    const orgs = await prisma.organization.findMany({
      // Simulated (scale-test) organisations are hidden unless platform staff ask for them.
      where: caller.platformStaffRole !== "NONE" ? (includeSimulated ? undefined : { isSimulated: false }) : { id: caller.organizationId },
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

  /** Who a user in this organisation should contact for help. If the
   * organisation has set a primary contact with an email, that wins;
   * otherwise its active administrators (anyone holding org.users.manage —
   * never Universe platform staff), with their role names. Runs against the
   * organisation the request is acting as, so platform staff using the
   * organisation switcher see that organisation's contacts. */
  async supportContacts(caller: RequestUser): Promise<SupportContact[]> {
    const organizationId = caller.organizationId;
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { primaryContactName: true, primaryContactTitle: true, primaryContactEmail: true },
    });
    if (org?.primaryContactEmail) {
      return [{ name: org.primaryContactName ?? org.primaryContactEmail, role: org.primaryContactTitle ?? "Primary contact", email: org.primaryContactEmail }];
    }
    const runInContext = (fn: (tx: any) => Promise<any>): Promise<any> => (caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
    const admins: any[] = await runInContext((tx) =>
      tx.user.findMany({
        where: {
          organizationId,
          status: "ACTIVE",
          platformStaffRole: "NONE",
          userRoles: { some: { role: { rolePermissions: { some: { permission: { key: "org.users.manage" } } } } } },
        },
        include: { userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } } },
        orderBy: [{ surname: "asc" }, { forename: "asc" }],
        take: 3,
      }),
    );
    return admins.map((u) => ({
      name: `${u.forename} ${u.surname}`.trim(),
      role: u.userRoles.find((ur: any) => ur.role.rolePermissions.some((rp: any) => rp.permission.key === "org.users.manage"))?.role.name ?? "Administrator",
      email: u.email,
    }));
  }

  /** Fields only platform staff (Universe's own operating team) may change.
   * An org admin can't rename their own tenant, re-slug its URLs, or flip
   * its lifecycle status — all identity/contractual-level facts. */
  private static readonly PLATFORM_ONLY_FIELDS = ["name", "slug", "status", "onboardingSource"] as const;

  /** Fields an org admin holding org.profile.manage may change for their own org. */
  private static readonly ORG_EDITABLE_FIELDS = [
    "legalName",
    "legalEntityType",
    "countryOfRegistrationCode",
    "registrationNumber",
    "website",
    "primaryContactName",
    "primaryContactTitle",
    "primaryContactEmail",
    "primaryContactPhone",
    "logoUrl",
    "primaryColor",
    "secondaryColor",
    "welcomeMessage",
    "notes",
  ] as const;

  private toDetail(
    o: any,
    userCount: number,
    activeUserCount: number,
  ): OrganizationDetail {
    return {
      id: o.id,
      name: o.name,
      slug: o.slug,
      status: o.status as OrganizationDetail["status"],
      type: o.type as OrganizationDetail["type"],
      logoUrl: o.logoUrl,
      logoIconUrl: o.logoIconUrl ?? null,
      primaryColor: o.primaryColor,
      secondaryColor: o.secondaryColor,
      countryOfRegistrationCode: o.countryOfRegistrationCode,
      legalName: o.legalName,
      legalEntityType: o.legalEntityType as OrganizationDetail["legalEntityType"],
      registrationNumber: o.registrationNumber,
      website: o.website,
      primaryContactName: o.primaryContactName,
      primaryContactTitle: o.primaryContactTitle,
      primaryContactEmail: o.primaryContactEmail,
      primaryContactPhone: o.primaryContactPhone,
      onboardingSource: o.onboardingSource as OrganizationDetail["onboardingSource"],
      welcomeMessage: o.welcomeMessage ?? null,
      notes: o.notes,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      userCount,
      activeUserCount,
    };
  }

  /** One organisation, full record, plus user counts. Platform staff: any
   * org. Everyone else: their own, with org.profile.manage. */
  async findOne(caller: RequestUser, organizationId: string): Promise<OrganizationDetail> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException(`Organisation ${organizationId} not found`);
    const runInContext = (fn: (tx: any) => Promise<any>): Promise<any> => (caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
    const [userCount, activeUserCount] = await runInContext(async (tx: any) => [
      await tx.user.count({ where: { organizationId } }),
      await tx.user.count({ where: { organizationId, status: "ACTIVE" } }),
    ]);
    return this.toDetail(org, userCount, activeUserCount);
  }

  /** Edit an organisation. Every changed field is written to FieldChangeLog
   * (table "organizations") in the same transaction as the update. */
  async update(caller: RequestUser, organizationId: string, dto: UpdateOrganizationDto): Promise<OrganizationDetail> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const isPlatform = caller.platformStaffRole !== "NONE";

    const allFields = [...OrganizationsService.PLATFORM_ONLY_FIELDS, ...OrganizationsService.ORG_EDITABLE_FIELDS] as readonly string[];
    const touched = allFields.filter((f) => (dto as any)[f] !== undefined);
    if (!isPlatform) {
      const blocked = touched.filter((f) => (OrganizationsService.PLATFORM_ONLY_FIELDS as readonly string[]).includes(f));
      if (blocked.length > 0) {
        throw new ForbiddenException(`Only platform staff can change: ${blocked.join(", ")}`);
      }
    }
    for (const f of ["name", "slug", "status"] as const) {
      if ((dto as any)[f] === null) throw new BadRequestException(`${f} cannot be cleared`);
    }
    if (typeof dto.name === "string" && dto.name.trim() === "") throw new BadRequestException("name cannot be empty");

    const existing = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!existing) throw new NotFoundException(`Organisation ${organizationId} not found`);

    if (dto.countryOfRegistrationCode) {
      const country = await prisma.country.findUnique({ where: { code: dto.countryOfRegistrationCode } });
      if (!country) throw new BadRequestException(`Unknown country code ${dto.countryOfRegistrationCode}`);
    }
    if (dto.slug && dto.slug !== existing.slug) {
      const clash = await prisma.organization.findUnique({ where: { slug: dto.slug } });
      if (clash) throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    }

    const changes = diffForAudit(existing, dto, touched);
    const data: Record<string, unknown> = {};
    for (const c of changes) data[c.field] = (dto as any)[c.field];

    const runInContext = (fn: (tx: any) => Promise<any>): Promise<any> => (isPlatform ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
    const result = await runInContext(async (tx: any) => {
      const updated = Object.keys(data).length > 0 ? await tx.organization.update({ where: { id: organizationId }, data }) : existing;
      await recordFieldChanges(tx, {
        organizationId,
        tableName: "organizations",
        recordId: organizationId,
        changedById: caller.id,
        changes,
        source: "API",
      });
      const userCount = await tx.user.count({ where: { organizationId } });
      const activeUserCount = await tx.user.count({ where: { organizationId, status: "ACTIVE" } });
      return { updated, userCount, activeUserCount };
    });
    return this.toDetail(result.updated, result.userCount, result.activeUserCount);
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
    const runInContext = (fn: (tx: any) => Promise<any>): Promise<any> => (caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
    const roles = await runInContext((tx: any) =>
      tx.role.findMany({
        where: { organizationId, archivedAt: null },
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
    const runInContext = (fn: (tx: any) => Promise<any>): Promise<any> => (caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
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

  /** "Which countries does this org operate in" — the general onboarding
   * fact for any Organization.type (see OrganizationCountryPresence's
   * schema.prisma doc comment for why this is a separate table from
   * SupplierCountryPresence). Added 2026-10-14, same RLS-context
   * requirement as findRoles/getDataSharingConsent above:
   * organization_country_presence is RLS-protected (row-level-security.sql,
   * added in the same change as this method). */
  async listCountryPresence(caller: RequestUser, organizationId: string): Promise<OrganizationCountryPresenceSummary[]> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const runInContext = (fn: (tx: any) => Promise<any>): Promise<any> => (caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
    const rows = await runInContext((tx: any) =>
      tx.organizationCountryPresence.findMany({ where: { organizationId } }),
    );
    return rows.map((r: any) => ({ countryCode: r.countryCode }));
  }

  /** Replace-the-whole-list semantics — same pattern as
   * SupplierDirectoryService.setCountryPresence (deleteMany then
   * createMany), the exact precedent this was built from. */
  async setCountryPresence(
    caller: RequestUser,
    organizationId: string,
    dto: SetOrganizationCountryPresenceDto,
  ): Promise<OrganizationCountryPresenceSummary[]> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const runInContext = (fn: (tx: any) => Promise<any>): Promise<any> => (caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
    return runInContext(async (tx: any) => {
      await tx.organizationCountryPresence.deleteMany({ where: { organizationId } });
      if (dto.countryCodes.length > 0) {
        await tx.organizationCountryPresence.createMany({
          data: dto.countryCodes.map((countryCode: string) => ({ organizationId, countryCode })),
        });
      }
      const rows = await tx.organizationCountryPresence.findMany({ where: { organizationId } });
      return rows.map((r: any) => ({ countryCode: r.countryCode }));
    });
  }

  // -------------------------------------------------------------------
  // Org-type detail profiles — added 2026-10-14, closing the last five of
  // the original 7-table RLS gap (see row-level-security.sql's new
  // predicates added in the same change) and the last five of the 10
  // dead-schema models from backend-frontend-wiring-audit.md.
  // ProcurementAgentProfile/TenderingBodyProfile/FunderProfile/
  // DataInsightsUserProfile are 1:1 with Organization (get/upsert);
  // OrganizationManufacturerSite is 1:many (list/add/remove), same shape
  // decision as SupplierProduct. All five gated by org.profile.manage —
  // this is still "manage your own organization's profile fields", just
  // the category-specific fields rather than the universal ones
  // (countries of operation) that permission started with.
  //
  // JSON-stringified array columns are parsed on the way out and
  // re-stringified on the way in — toJsonArray/fromJsonArray below centralise
  // that, rather than repeating JSON.parse(x || "[]")/JSON.stringify(x ?? [])
  // five times.
  // -------------------------------------------------------------------

  async getProcurementAgentProfile(caller: RequestUser, organizationId: string): Promise<ProcurementAgentProfileSummary | null> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const runInContext = (fn: (tx: any) => Promise<any>): Promise<any> => (caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
    const row = await runInContext((tx: any) => tx.procurementAgentProfile.findUnique({ where: { organizationId } }));
    if (!row) return null;
    return {
      organizationId: row.organizationId,
      fundersProgramsOperatedUnder: fromJsonArray(row.fundersProgramsOperatedUnder),
      productCategoriesProcured: fromJsonArray(row.productCategoriesProcured),
      clientTypesServed: fromJsonArray(row.clientTypesServed),
      accreditations: fromJsonArray(row.accreditations),
      logisticsCapability: row.logisticsCapability ?? null,
      yearsOperatingInRole: row.yearsOperatingInRole ?? null,
      insuranceCoverSummary: row.insuranceCoverSummary ?? null,
      insuranceExpiryDate: row.insuranceExpiryDate ? row.insuranceExpiryDate.toISOString() : null,
      trackRecordSummary: row.trackRecordSummary ?? null,
    };
  }

  async upsertProcurementAgentProfile(
    caller: RequestUser,
    organizationId: string,
    dto: UpsertProcurementAgentProfileDto,
  ): Promise<ProcurementAgentProfileSummary> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const runInContext = (fn: (tx: any) => Promise<any>): Promise<any> => (caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
    const data = {
      fundersProgramsOperatedUnder: toJsonArray(dto.fundersProgramsOperatedUnder),
      productCategoriesProcured: toJsonArray(dto.productCategoriesProcured),
      clientTypesServed: toJsonArray(dto.clientTypesServed),
      accreditations: toJsonArray(dto.accreditations),
      logisticsCapability: dto.logisticsCapability,
      yearsOperatingInRole: dto.yearsOperatingInRole,
      insuranceCoverSummary: dto.insuranceCoverSummary,
      insuranceExpiryDate: dto.insuranceExpiryDate ? new Date(dto.insuranceExpiryDate) : undefined,
      trackRecordSummary: dto.trackRecordSummary,
    };
    await runInContext((tx: any) =>
      tx.procurementAgentProfile.upsert({
        where: { organizationId },
        update: data,
        create: { organizationId, ...data },
      }),
    );
    return (await this.getProcurementAgentProfile(caller, organizationId))!;
  }

  async getTenderingBodyProfile(caller: RequestUser, organizationId: string): Promise<TenderingBodyProfileSummary | null> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const runInContext = (fn: (tx: any) => Promise<any>): Promise<any> => (caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
    const row = await runInContext((tx: any) =>
      tx.tenderingBodyProfile.findUnique({
        where: { organizationId },
        include: { procurementAgentOrganization: { select: { name: true } } },
      }),
    );
    if (!row) return null;
    return {
      organizationId: row.organizationId,
      bodyType: row.bodyType ?? null,
      fundingSources: fromJsonArray(row.fundingSources),
      hasDirectProcurementAuthority: row.hasDirectProcurementAuthority ?? null,
      usesExternalProcurementAgent: row.usesExternalProcurementAgent,
      procurementAgentOrganizationId: row.procurementAgentOrganizationId ?? null,
      procurementAgentOrganizationName: row.procurementAgentOrganization?.name ?? null,
      diseaseProgramAreas: fromJsonArray(row.diseaseProgramAreas),
      scaleServedSummary: row.scaleServedSummary ?? null,
    };
  }

  async upsertTenderingBodyProfile(
    caller: RequestUser,
    organizationId: string,
    dto: UpsertTenderingBodyProfileDto,
  ): Promise<TenderingBodyProfileSummary> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const runInContext = (fn: (tx: any) => Promise<any>): Promise<any> => (caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
    const data = {
      bodyType: dto.bodyType,
      fundingSources: toJsonArray(dto.fundingSources),
      hasDirectProcurementAuthority: dto.hasDirectProcurementAuthority,
      usesExternalProcurementAgent: dto.usesExternalProcurementAgent,
      procurementAgentOrganizationId: dto.procurementAgentOrganizationId,
      diseaseProgramAreas: toJsonArray(dto.diseaseProgramAreas),
      scaleServedSummary: dto.scaleServedSummary,
    };
    await runInContext((tx: any) =>
      tx.tenderingBodyProfile.upsert({
        where: { organizationId },
        update: data,
        create: { organizationId, ...data },
      }),
    );
    return (await this.getTenderingBodyProfile(caller, organizationId))!;
  }

  async getFunderProfile(caller: RequestUser, organizationId: string): Promise<FunderProfileSummary | null> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const runInContext = (fn: (tx: any) => Promise<any>): Promise<any> => (caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
    const row = await runInContext((tx: any) => tx.funderProfile.findUnique({ where: { organizationId } }));
    if (!row) return null;
    return {
      organizationId: row.organizationId,
      fundingFocusAreas: fromJsonArray(row.fundingFocusAreas),
      notes: row.notes ?? null,
    };
  }

  async upsertFunderProfile(caller: RequestUser, organizationId: string, dto: UpsertFunderProfileDto): Promise<FunderProfileSummary> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const runInContext = (fn: (tx: any) => Promise<any>): Promise<any> => (caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
    const data = { fundingFocusAreas: toJsonArray(dto.fundingFocusAreas), notes: dto.notes };
    await runInContext((tx: any) =>
      tx.funderProfile.upsert({ where: { organizationId }, update: data, create: { organizationId, ...data } }),
    );
    return (await this.getFunderProfile(caller, organizationId))!;
  }

  async getDataInsightsUserProfile(caller: RequestUser, organizationId: string): Promise<DataInsightsUserProfileSummary | null> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const runInContext = (fn: (tx: any) => Promise<any>): Promise<any> => (caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
    const row = await runInContext((tx: any) => tx.dataInsightsUserProfile.findUnique({ where: { organizationId } }));
    if (!row) return null;
    return {
      organizationId: row.organizationId,
      institutionType: row.institutionType ?? null,
      affiliatedInstitution: row.affiliatedInstitution ?? null,
      purposeIntendedUse: row.purposeIntendedUse ?? null,
      publicationIntent: row.publicationIntent ?? null,
      fundingSourceOfResearch: row.fundingSourceOfResearch ?? null,
      dataUseAgreementVersion: row.dataUseAgreementVersion ?? null,
      dataUseAgreementAcceptedAt: row.dataUseAgreementAcceptedAt ? row.dataUseAgreementAcceptedAt.toISOString() : null,
    };
  }

  async upsertDataInsightsUserProfile(
    caller: RequestUser,
    organizationId: string,
    dto: UpsertDataInsightsUserProfileDto,
  ): Promise<DataInsightsUserProfileSummary> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const runInContext = (fn: (tx: any) => Promise<any>): Promise<any> => (caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
    const data = {
      institutionType: dto.institutionType,
      affiliatedInstitution: dto.affiliatedInstitution,
      purposeIntendedUse: dto.purposeIntendedUse,
      publicationIntent: dto.publicationIntent,
      fundingSourceOfResearch: dto.fundingSourceOfResearch,
      dataUseAgreementVersion: dto.dataUseAgreementVersion,
      dataUseAgreementAcceptedAt: dto.dataUseAgreementAcceptedAt ? new Date(dto.dataUseAgreementAcceptedAt) : undefined,
    };
    await runInContext((tx: any) =>
      tx.dataInsightsUserProfile.upsert({ where: { organizationId }, update: data, create: { organizationId, ...data } }),
    );
    return (await this.getDataInsightsUserProfile(caller, organizationId))!;
  }

  /** OrganizationManufacturerSite is one-to-many — list/add/remove, not
   * get/upsert, same shape as OrganizationCountryPresence's sibling list
   * endpoints but WITHOUT replace-the-whole-list semantics: a manufacturer
   * adding a fourth site shouldn't require re-submitting the other three. */
  async listManufacturerSites(caller: RequestUser, organizationId: string): Promise<OrganizationManufacturerSiteSummary[]> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const runInContext = (fn: (tx: any) => Promise<any>): Promise<any> => (caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
    const rows = await runInContext((tx: any) =>
      tx.organizationManufacturerSite.findMany({ where: { organizationId, archivedAt: null }, orderBy: { createdAt: "asc" } }),
    );
    return rows.map(toManufacturerSiteSummary);
  }

  async addManufacturerSite(
    caller: RequestUser,
    organizationId: string,
    dto: AddManufacturerSiteDto,
  ): Promise<OrganizationManufacturerSiteSummary> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const runInContext = (fn: (tx: any) => Promise<any>): Promise<any> => (caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
    const row = await runInContext((tx: any) =>
      tx.organizationManufacturerSite.create({
        data: {
          organizationId,
          locationCountryCode: dto.locationCountryCode,
          locationDetail: dto.locationDetail,
          gmpCertified: dto.gmpCertified ?? false,
          gmpCertificationDetail: dto.gmpCertificationDetail,
        },
      }),
    );
    return toManufacturerSiteSummary(row);
  }

  async removeManufacturerSite(caller: RequestUser, organizationId: string, siteId: string): Promise<void> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const runInContext = (fn: (tx: any) => Promise<any>): Promise<any> => (caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn));
    // deleteMany (not delete) scoped by organizationId too, not just id —
    // belt-and-suspenders against ever deleting another org's row even if
    // RLS or assertCanManageOrg were somehow bypassed; same defensive
    // pattern as every other cross-tenant-sensitive delete in this file.
    await runInContext((tx: any) => tx.organizationManufacturerSite.updateMany({ where: { id: siteId, organizationId, archivedAt: null }, data: { archivedAt: new Date(), archivedById: caller.id } }));
  }
}

function toManufacturerSiteSummary(row: any): OrganizationManufacturerSiteSummary {
  return {
    id: row.id,
    organizationId: row.organizationId,
    locationCountryCode: row.locationCountryCode ?? null,
    locationDetail: row.locationDetail ?? null,
    gmpCertified: row.gmpCertified,
    gmpCertificationDetail: row.gmpCertificationDetail ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function fromJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toJsonArray(value: string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return JSON.stringify(value);
}
