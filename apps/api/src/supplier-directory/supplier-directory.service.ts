import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma, withTenantContext } from "@universe/db";
import { assertCanManageOrg } from "../common/authorization";
import type { RequestUser } from "../auth/entra-auth.guard";
import type {
  CreateSupplierProductDto,
  SetCountryPresenceDto,
  UpdateSupplierProductDto,
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
  /** Anyone authenticated can search — this is the marketplace's core
   * function, not gated by a specific permission (buyers and suppliers
   * alike should be able to browse). */
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
    assertCanManageOrg(caller, caller.organizationId, "supplier.profile.manage");
    return withTenantContext(caller.organizationId, (tx) =>
      tx.supplierProfile.update({
        where: { organizationId: caller.organizationId },
        data: { publishedAt: published ? new Date() : null },
      }),
    );
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
    const product = await withTenantContext(caller.organizationId, (tx) =>
      tx.supplierProduct.findFirst({
        where: { id: supplierProductId, isPublished: true },
        include: { organization: { select: { id: true, name: true } } },
      }),
    );
    if (!product) throw new NotFoundException("Supplier product not found or not published.");

    if (product.organizationId === caller.organizationId) {
      throw new BadRequestException("Cannot select your own organization's product.");
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
