import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import { assertCanManageOrg, assertNotDemoUser } from "../common/authorization";
import { NetworkSearchesService } from "./network-searches.service";
import { StakeholderRegistryService } from "../stakeholder-registry/stakeholder-registry.service";
import type { RequestUser } from "../auth/entra-auth.guard";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
import type { NetworkSearchResult, OrgDirectoryProfile } from "@universe/types";
import { orgTypesOf } from "@universe/types";
import type {
  CreateSupplierProductDto,
  SetCountryPresenceDto,
  UpdateSupplierProductDto,
  UpsertOrgDirectoryProfileDto,
  UpsertSupplierProfileDto,
} from "./dto/supplier-directory.dto";

/**
 * Supplier/manufacturer marketplace (added 2026-09-24 — see architecture
 * doc, "Supplier/manufacturer marketplace"). The opposite anonymity model
 * from the Insights aggregate store (@universe/insights-db): here the whole
 * point is that a published supplier profile/product IS identifiable and
 * searchable by every other organization on the platform, in exchange for
 * exposure to buyer demand.
 *
 * Reads across the whole directory (search, viewing another org's published
 * profile) go through withTenantContext(caller.organizationId, ...) same as
 * any normal request — that's not a mistake: infra/sql/supplier-directory-rls.sql
 * gives supplier_profiles/supplier_products/supplier_country_presence a
 * FILTER predicate that's true for ANY authenticated org context, not just
 * the row's own org, so this naturally returns every published row across
 * every organization. Writes still only succeed against the caller's own
 * org — the BLOCK predicate on those same tables reuses the normal
 * ownership check.
 *
 * supplier_leads is the one exception — deliberately outside any RLS policy
 * (see its own model comment in schema.prisma and
 * infra/sql/supplier-directory-rls.sql's header) because it has two
 * different organization-reference columns that a single-column RLS
 * predicate can't express correctly. Access to it is authorized here in
 * code instead, the same "controlled cross-tenant access enforced in the
 * application layer" pattern EntraAuthGuard's identity lookup already uses.
 */
@Injectable()
export class SupplierDirectoryService {
  constructor(private readonly stakeholderRegistryService: StakeholderRegistryService, private readonly networkSearches: NetworkSearchesService) {}

  /** Anyone authenticated can search — this is the marketplace's core
   * function, not gated by a specific permission (buyers and suppliers
   * alike should be able to browse). */
  /**
   * The network directory: organisations that have published their profile. Filters: name or description, organisation type, scope-of-supply
   * categories (any of), countries of operation (any of), certifications held and not expired (all of), minimum years in operation, warehousing,
   * WHO prequalified and local manufacturer. Also returns headline statistics and breakdowns of the whole matching set (not just the page) for the
   * dashboard tiles. Read in a system context because the rows belong to other organisations; only published, public fields leave.
   */
  async network(
    caller: RequestUser,
    f: { q?: string; type?: string; scope?: string; country?: string; certType?: string; minYears?: number; warehousing?: string; whoPq?: boolean; localMfr?: boolean; certified?: boolean; sort?: string; offset?: number },
  ): Promise<NetworkSearchResult> {
    const list = (v?: string, max = 60) => (v ?? "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, max);
    const scopeIds = list(f.scope);
    const countryCodes = list(f.country).map((c) => c.toUpperCase());
    const certTypes = list(f.certType, 10);
    const q = f.q?.trim();
    const notExpired = { archivedAt: null, OR: [{ expiresOn: null }, { expiresOn: { gte: new Date() } }] };
    const and: any[] = [];
    if (scopeIds.length) and.push({ organization: { scopeOfSupply: { some: { scopeSubId: { in: scopeIds }, archivedAt: null } } } });
    if (countryCodes.length) and.push({ organization: { OR: [{ countryPresence: { some: { countryCode: { in: countryCodes } } } }, { supplierCountryPresence: { some: { countryCode: { in: countryCodes } } } }] } });
    for (const t of certTypes) and.push({ organization: { certifications: { some: { type: t, ...notExpired } } } });
    if (f.certified) and.push({ organization: { certifications: { some: notExpired } } });
    if (f.whoPq) and.push({ organization: { manufacturerProfile: { whoPrequalified: true } } });
    if (f.localMfr) and.push({ organization: { manufacturerProfile: { isLocalManufacturer: true } } });
    if (q) and.push({ OR: [{ description: { contains: q } }, { organization: { name: { contains: q } } }, { principalManufacturersRepresented: { contains: q } }] });
    const where: any = {
      publishedAt: { not: null },
      ...(f.type ? { organization: { OR: [{ type: f.type }, { additionalTypes: { contains: `,${f.type},` } }] } } : {}),
      ...(f.minYears ? { yearsInOperation: { gte: f.minYears } } : {}),
      ...(f.warehousing ? { warehousingCapability: f.warehousing } : {}),
      ...(and.length ? { AND: and } : {}),
    };
    return withPlatformStaffContext(async (tx: any) => {
      const rows = await tx.supplierProfile.findMany({
        where,
        take: 1000,
        include: { organization: { select: { id: true, name: true, type: true, additionalTypes: true, scopeOfSupply: { where: { archivedAt: null }, select: { scopeSubId: true } }, countryPresence: { select: { countryCode: true } }, supplierCountryPresence: { select: { countryCode: true } }, certifications: { where: notExpired, select: { type: true } } } } },
      });
      const all = rows.map((r: any) => ({
        id: r.organization.id as string,
        name: r.organization.name as string,
        type: r.organization.type as string,
        types: orgTypesOf({ type: r.organization.type, additionalTypes: r.organization.additionalTypes }),
        description: (r.description ?? null) as string | null,
        countryCodes: [...new Set<string>([...r.organization.countryPresence, ...r.organization.supplierCountryPresence].map((c: any) => c.countryCode))].sort(),
        scope: r.organization.scopeOfSupply.map((x: any) => x.scopeSubId) as string[],
        certificationTypes: [...new Set<string>(r.organization.certifications.map((c: any) => c.type))],
        yearsInOperation: (r.yearsInOperation ?? null) as number | null,
      }));
      const tally = (pick: (o: (typeof all)[number]) => string[]) => {
        const m = new Map<string, number>();
        for (const o of all) for (const k of new Set(pick(o))) m.set(k, (m.get(k) ?? 0) + 1);
        return [...m].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
      };
      const facets = { countries: tally((o) => o.countryCodes), scope: tally((o) => o.scope), certifications: tally((o) => o.certificationTypes), types: tally((o) => o.types) };
      const stats = { suppliers: all.length, countries: facets.countries.length, categories: facets.scope.length, certified: all.filter((o: any) => o.certificationTypes.length > 0).length };
      const sorters: Record<string, (a: (typeof all)[number], b: (typeof all)[number]) => number> = {
        name: (a, b) => a.name.localeCompare(b.name),
        years: (a, b) => (b.yearsInOperation ?? -1) - (a.yearsInOperation ?? -1) || a.name.localeCompare(b.name),
        categories: (a, b) => b.scope.length - a.scope.length || a.name.localeCompare(b.name),
        countries: (a, b) => b.countryCodes.length - a.countryCodes.length || a.name.localeCompare(b.name),
        certifications: (a, b) => b.certificationTypes.length - a.certificationTypes.length || a.name.localeCompare(b.name),
      };
      all.sort(sorters[f.sort ?? "name"] ?? sorters.name);
      const offset = Math.max(0, f.offset ?? 0);
      return { total: all.length, stats, facets, organizations: all.slice(offset, offset + 50) };
    });
  }

  async search(caller: RequestUser, category?: string, countryCode?: string) {
    return withTenantContext(caller.organizationId, (tx) =>
      tx.supplierProduct.findMany({
        where: {
          isPublished: true,
          productMaster: category ? { category } : undefined,
          organization: countryCode ? { supplierCountryPresence: { some: { countryCode } } } : undefined,
        },
        include: {
          organization: { select: { id: true, name: true, slug: true } },
          productMaster: { select: { category: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
    );
  }

  /** A specific supplier's public profile + country presence — only
   * meaningful (and only returned) once published, unless the caller IS
   * that org or platform staff, mirroring the pattern used elsewhere for
   * "see your own unpublished/pending state". */
  async getProfile(caller: RequestUser, organizationId: string) {
    const profile = await withTenantContext(caller.organizationId, (tx) =>
      tx.supplierProfile.findUnique({
        where: { organizationId },
        include: { organization: { select: { id: true, name: true, slug: true, type: true } } },
      }),
    );
    if (!profile) throw new NotFoundException("Supplier profile not found.");

    const isOwnOrg = caller.organizationId === organizationId;
    if (!profile.publishedAt && !isOwnOrg && caller.platformStaffRole === "NONE") {
      throw new NotFoundException("Supplier profile not found.");
    }

    const countryPresence = await withTenantContext(caller.organizationId, (tx) =>
      tx.supplierCountryPresence.findMany({ where: { organizationId }, select: { countryCode: true } }),
    );

    return { ...profile, countryCodes: countryPresence.map((c) => c.countryCode) };
  }

  async getMyProfile(caller: RequestUser) {
    return withTenantContext(caller.organizationId, (tx) =>
      tx.supplierProfile.findUnique({ where: { organizationId: caller.organizationId } }),
    );
  }

  async upsertMyProfile(caller: RequestUser, dto: UpsertSupplierProfileDto) {
    assertCanManageOrg(caller, caller.organizationId, "supplier.profile.manage");
    return withTenantContext(caller.organizationId, (tx) =>
      tx.supplierProfile.upsert({
        where: { organizationId: caller.organizationId },
        update: dto,
        create: { organizationId: caller.organizationId, ...dto },
      }),
    );
  }

  /** Separate from upsert on purpose — publishing is the action that makes
   * a profile (and, transitively, anything meaningful about it) visible to
   * every other org, so it's a deliberate step, not a side effect of
   * saving a draft. */
  async setPublished(caller: RequestUser, published: boolean) {
    assertNotDemoUser(caller, "Publishing to the supplier directory");
    assertCanManageOrg(caller, caller.organizationId, "supplier.profile.manage");
    const result = await withTenantContext(caller.organizationId, (tx) =>
      tx.supplierProfile.update({
        where: { organizationId: caller.organizationId },
        data: { publishedAt: published ? new Date() : null },
      }),
    );
    // Reconciliation (2026-10-02, sop-driven-quality-roadmap.md Section
    // C "reverse direction"): publishing is the moment this organisation's
    // real identity becomes something other orgs' Partner records are
    // allowed to show, so this is also the moment to link any existing
    // stakeholder registry entry that plausibly represents the same real
    // company — see StakeholderRegistryService.reconcileOnPublish.
    // Unpublishing deliberately does NOT unlink — the registry link itself
    // just records "this is the same real company", independent of
    // whether that company's profile happens to be published right now.
    if (published) {
      await this.stakeholderRegistryService.reconcileOnPublish(caller.organizationId);
      await this.networkSearches.alertOnPublish(caller.organizationId);
    }
    return result;
  }


  // ---- Organisation hub (Admin): the same profile, addressed by organisation so an org admin or platform staff can edit it ----

  private runFor<T>(caller: RequestUser, organizationId: string, fn: (tx: any) => Promise<T>): Promise<T> {
    return caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn);
  }

  private toOrgProfile(organizationId: string, row: any | null): OrgDirectoryProfile {
    let manufacturers: string[] = [];
    try {
      const parsed = row?.principalManufacturersRepresented ? JSON.parse(row.principalManufacturersRepresented) : [];
      if (Array.isArray(parsed)) manufacturers = parsed.filter((x) => typeof x === "string");
    } catch {
      manufacturers = [];
    }
    return {
      organizationId,
      description: row?.description ?? null,
      website: row?.website ?? null,
      contactName: row?.contactName ?? null,
      contactEmail: row?.contactEmail ?? null,
      contactPhone: row?.contactPhone ?? null,
      principalManufacturersRepresented: manufacturers,
      wholesaleDistributionLicense: row?.wholesaleDistributionLicense ?? null,
      warehousingCapability: (row?.warehousingCapability as OrgDirectoryProfile["warehousingCapability"]) ?? null,
      yearsInOperation: row?.yearsInOperation ?? null,
      publishedAt: row?.publishedAt ? row.publishedAt.toISOString() : null,
    };
  }

  async getOrgProfile(caller: RequestUser, organizationId: string): Promise<OrgDirectoryProfile> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const row = await this.runFor(caller, organizationId, (tx) => tx.supplierProfile.findUnique({ where: { organizationId } }));
    return this.toOrgProfile(organizationId, row);
  }

  async upsertOrgProfile(caller: RequestUser, organizationId: string, dto: UpsertOrgDirectoryProfileDto): Promise<OrgDirectoryProfile> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const { principalManufacturersRepresented, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (principalManufacturersRepresented !== undefined) {
      data.principalManufacturersRepresented = JSON.stringify(principalManufacturersRepresented.map((m) => m.trim()).filter(Boolean));
    }
    const fields = Object.keys(data);
    const row = await this.runFor(caller, organizationId, async (tx) => {
      const existing = await tx.supplierProfile.findUnique({ where: { organizationId } });
      const saved = await tx.supplierProfile.upsert({ where: { organizationId }, update: data, create: { organizationId, ...data } });
      await recordFieldChanges(tx, {
        organizationId,
        tableName: "supplier_profiles",
        recordId: saved.id,
        changedById: caller.id,
        changes: diffForAudit(existing ?? {}, data, fields),
        source: "API",
      });
      return saved;
    });
    return this.toOrgProfile(organizationId, row);
  }

  async setOrgPublished(caller: RequestUser, organizationId: string, published: boolean): Promise<OrgDirectoryProfile> {
    assertNotDemoUser(caller, "Publishing to the supplier directory");
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const existing = await this.runFor(caller, organizationId, (tx) => tx.supplierProfile.findUnique({ where: { organizationId } }));
    if (!existing) throw new BadRequestException("Save the profile before publishing it.");
    const row = await this.runFor(caller, organizationId, async (tx) => {
      const saved = await tx.supplierProfile.update({ where: { organizationId }, data: { publishedAt: published ? new Date() : null } });
      await recordFieldChanges(tx, {
        organizationId,
        tableName: "supplier_profiles",
        recordId: saved.id,
        changedById: caller.id,
        changes: [{ field: "published", oldValue: (existing as any).publishedAt ? "yes" : "no", newValue: published ? "yes" : "no" }],
        source: "API",
      });
      return saved;
    });
    if (published) {
      await this.stakeholderRegistryService.reconcileOnPublish(organizationId);
      if (!(existing as any).publishedAt) await this.networkSearches.alertOnPublish(organizationId);
    }
    return this.toOrgProfile(organizationId, row);
  }

  async setCountryPresence(caller: RequestUser, dto: SetCountryPresenceDto) {
    assertCanManageOrg(caller, caller.organizationId, "supplier.profile.manage");
    return withTenantContext(caller.organizationId, async (tx) => {
      // Replace-the-whole-list semantics — simplest correct behavior for a
      // "which countries do we serve" multi-select form, and this table is
      // small per org (never more than the ~194 WHO member states).
      await tx.supplierCountryPresence.deleteMany({ where: { organizationId: caller.organizationId } });
      if (dto.countryCodes.length === 0) return [];
      await tx.supplierCountryPresence.createMany({
        data: dto.countryCodes.map((countryCode) => ({ organizationId: caller.organizationId, countryCode })),
      });
      return tx.supplierCountryPresence.findMany({ where: { organizationId: caller.organizationId } });
    });
  }

  async listMyProducts(caller: RequestUser) {
    return withTenantContext(caller.organizationId, (tx) =>
      tx.supplierProduct.findMany({ where: { organizationId: caller.organizationId }, orderBy: { updatedAt: "desc" } }),
    );
  }

  async createProduct(caller: RequestUser, dto: CreateSupplierProductDto) {
    assertCanManageOrg(caller, caller.organizationId, "supplier.products.manage");
    return withTenantContext(caller.organizationId, (tx) =>
      tx.supplierProduct.create({ data: { organizationId: caller.organizationId, createdById: caller.id, ...dto } }),
    );
  }

  async updateProduct(caller: RequestUser, id: string, dto: UpdateSupplierProductDto) {
    assertCanManageOrg(caller, caller.organizationId, "supplier.products.manage");
    // The BLOCK predicate on supplier_products (infra/sql/supplier-directory-rls.sql)
    // already refuses this UPDATE at the database layer if `id` doesn't
    // belong to the caller's own org — this findFirst is just for a clean
    // 404 instead of an opaque DB error.
    const existing = await withTenantContext(caller.organizationId, (tx) =>
      tx.supplierProduct.findFirst({ where: { id, organizationId: caller.organizationId } }),
    );
    if (!existing) throw new NotFoundException("Supplier product not found.");

    return withTenantContext(caller.organizationId, (tx) => tx.supplierProduct.update({ where: { id }, data: dto }));
  }

  /**
   * A buying organization selects a published supplier product — records a
   * SupplierLead (so the supplier can see the interest, per Lewis: "expose
   * themselves to a wide range of clients and opportunities") and hands
   * back the product's details for the buyer's own app to use when
   * creating their own tenant-scoped ProductLine/Partner records. This
   * deliberately does NOT auto-create anything in the buyer's own tenant
   * data — which project, which of the buyer's own Partner records it maps
   * to, etc. are decisions the buyer's own UI flow should make, not
   * something to guess here.
   */
  async selectProduct(caller: RequestUser, supplierProductId: string) {
    assertNotDemoUser(caller, "Selecting a supplier product");
    const product = await withTenantContext(caller.organizationId, (tx) =>
      tx.supplierProduct.findFirst({
        where: { id: supplierProductId, isPublished: true },
        include: { organization: { select: { id: true, name: true } } },
      }),
    );
    if (!product) throw new NotFoundException("Supplier product not found or not published.");

    if (product.organizationId === caller.organizationId) {
      throw new BadRequestException("Cannot select your own organisation's product.");
    }

    // supplier_leads carries no RLS policy — see this class's header
    // comment. Writing via bare `prisma` here is deliberate, not an
    // oversight.
    await prisma.supplierLead.create({
      data: { supplierOrganizationId: product.organizationId, buyerOrganizationId: caller.organizationId, supplierProductId: product.id },
    });

    return product;
  }

  /** Buyer interest in the caller's own org's products — supplier.leads.view
   * gated. Bare `prisma`, same reasoning as selectProduct above; the WHERE
   * clause IS the access control here since the table has no RLS. */
  async getMyLeads(caller: RequestUser) {
    assertCanManageOrg(caller, caller.organizationId, "supplier.leads.view");
    return prisma.supplierLead.findMany({
      where: { supplierOrganizationId: caller.organizationId },
      include: {
        buyerOrganization: { select: { id: true, name: true } },
        supplierProduct: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
