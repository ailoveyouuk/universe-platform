import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createNotifications, completeActionsFor, usersWithPermission } from "../notifications/notify";
import { prisma, withTenantContext, type Prisma } from "@universe/db";
import { tenantScope } from "../common/tenant-scoped";
import { recordFieldChanges } from "../common/audit-log";
import { computeCompliance } from "./product-registrations.service";
import { writeTargetChanges } from "./product-target";
import { attributionContext, maskContributor, type AttributionContext } from "./attribution";
import { assertHasPermission, assertNotDemoUser } from "../common/authorization";
import type {
  ProductCatalogDetail,
  ProductCatalogListResult,
  ProductCatalogMatch,
  ProductApprovedSource,
  ProductSearchResult,
  ProductSearchScope,
  ProductCatalogCompletenessStats,
  ProductCatalogDashboardStats,
  ProductPriceHistoryPoint,
  ProductAmendmentSummary,
  ProductChangeEntry,
  ProductUsageSummary,
  UpdateProductMasterResult,
  ImportProductMasterResult,
  UpdateProductMasterInput,
} from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { applyProductChangeSet, computeCompleteness, writeProductChanges, PRODUCT_RECORD_FIELDS, diffProductRecord } from "./product-record";
import type { CreateProductMasterDto } from "./dto/create-product-master.dto";
import type { UpdateProductMasterDto } from "./dto/update-product-master.dto";
import type { ImportProductMasterRowDto } from "./dto/import-product-master.dto";
import type { RejectProductAmendmentDto } from "./dto/reject-product-amendment.dto";

/** The DTO's own optional-field list — used both as the Prisma `data`
 * source for a direct apply and as diffForAudit's field list on
 * ratification. Keeping this one array as the source of truth means a new
 * editable field only needs adding here plus the DTO itself. */
const UPDATABLE_FIELDS = PRODUCT_RECORD_FIELDS;

/** Simulated (scale-test) catalogue entries are ring-fenced: only visible when the request runs inside a demo organisation. */
function simulatedFilter(showSimulated?: boolean): { isSimulated?: false } {
  return showSimulated ? {} : { isSimulated: false };
}

/**
 * The shared, central product catalogue (ProductMaster) — search-or-create,
 * the same reusable pattern as StakeholderRegistryService (see that file's
 * doc comment for the general shape): typeahead search first, an explicit
 * "add it" action second, never a silent auto-merge. `product_master`
 * carries no organizationId column and is deliberately excluded from
 * row-level-security.sql, so every read/search method here is bare
 * `prisma`, no withTenantContext — same reasoning product-source-approvals
 * .service.ts already documented for this table. That service's own
 * searchProducts now delegates to search() below rather than duplicating
 * the query.
 *
 * Built 2026-10-02 as the first concrete implementation of the pattern
 * Lewis asked to "remember... for when we build out the crm and
 * manufacturer/supplier app elements that can share the product creation
 * method" — see claude/product-catalog-build.md for the full build log.
 * Nothing here is Project-Management-specific: CRM and the future Supplier
 * Portal app should call these same three endpoints (search / getOne /
 * create) through the same `@universe/api-client` methods, and reuse the
 * `ProductPicker` component from `@universe/ui` for the UI, rather than
 * rebuilding either from scratch.
 *
 * Attribution (addedByOrganizationId/addedByOrganizationType) is frozen at
 * creation time purely as a provenance tag — see ProductMaster's doc
 * comment in schema.prisma. It is never used to gate *visibility*:
 * ProductMaster search/read stays open to every organisation, same as
 * today. It IS now used to gate *writes* — see update()'s doc comment,
 * added 2026-10-09 for the catalogue edit-rights + ratification workflow
 * (product-database-and-map-roadmap.md Stage 0 point 1, Lewis's explicit
 * design).
 */
@Injectable()
export class ProductCatalogService {
  /** Typeahead search — GET /product-catalog/search?q=&category=. Shared by
   * the Project Management line-item picker, the Quality module's existing
   * "new approval" product field, and, going forward, CRM/Supplier
   * Portal. */
  async search(q: string | undefined, category?: string, showSimulated = false, viewer?: RequestUser): Promise<ProductCatalogMatch[]> {
    const rows = await prisma.productMaster.findMany({
      where: {
        isArchived: false,
        ...simulatedFilter(showSimulated),
        ...(q && q.trim()
          ? { OR: [{ name: { contains: q.trim() } }, { brand: { contains: q.trim() } }, { inn: { contains: q.trim() } }, { gtin: { contains: q.trim() } }, { productFamily: { name: { contains: q.trim() } } }] }
          : {}),
        ...(category ? { category: { startsWith: category } } : {}),
      },
      include: { addedByOrganization: { select: { name: true } }, productFamily: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
      take: 25,
    });
    const pending = await this.pendingAmendmentIds(rows);
    const ctx = await attributionContext(viewer, rows.map((r) => r.addedByOrganizationId));
    return rows.map((r) => this.toMatch(r, pending.has(r.id), ctx));
  }

  /**
   * Scoped type-to-search for project lines (2026-10-18). One search across the shared catalogue and this organisation's own
   * source approvals: scope ALL lists the organisation's approved products first, then the rest of the catalogue (a product that
   * is both appears once, tagged); APPROVED shows only products this organisation has approved; CATALOGUE ignores approvals for
   * ordering but still tags them. Approvals are tenant data (RLS); the catalogue is shared.
   */
  async searchScoped(user: RequestUser, q: string | undefined, category: string | undefined, scope: ProductSearchScope = "ALL"): Promise<ProductSearchResult[]> {
    const showSimulated = user.inDemoOrganization === true;
    const term = q?.trim();
    const productWhere = {
      isArchived: false,
      ...simulatedFilter(showSimulated),
      ...(term ? { OR: [{ name: { contains: term } }, { brand: { contains: term } }, { inn: { contains: term } }, { gtin: { contains: term } }, { productFamily: { name: { contains: term } } }] } : {}),
      ...(category ? { category: { startsWith: category } } : {}),
    };
    const approvals = await withTenantContext(user.organizationId, (tx) =>
      tx.productSourceApproval.findMany({
        where: { ...tenantScope(user.organizationId), isArchived: false, productMaster: productWhere },
        include: { manufacturer: { select: { name: true } }, supplier: { select: { name: true } } },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 200,
      }),
    );
    const rank = { APPROVED: 3, IN_REVIEW: 2, REJECTED: 1 } as const;
    const byProduct = new Map<string, ProductApprovedSource[]>();
    const statusOf = new Map<string, "APPROVED" | "IN_REVIEW" | "REJECTED">();
    for (const a of approvals) {
      const st = a.status === "APPROVED" ? "APPROVED" : a.status === "REJECTED" ? "REJECTED" : "IN_REVIEW";
      byProduct.set(a.productMasterId, [...(byProduct.get(a.productMasterId) ?? []), { approvalId: a.id, status: a.status, manufacturerId: a.manufacturerId, manufacturerName: a.manufacturer?.name ?? null, supplierId: a.supplierId, supplierName: a.supplier?.name ?? null }]);
      const cur = statusOf.get(a.productMasterId);
      if (!cur || rank[st] > rank[cur]) statusOf.set(a.productMasterId, st);
    }
    const include = { addedByOrganization: { select: { name: true } }, productFamily: { select: { id: true, name: true } } } as const;
    const approvedIds = [...statusOf.entries()].filter(([, s]) => s === "APPROVED").map(([id]) => id);
    const fetched: Prisma.ProductMasterGetPayload<{ include: typeof include }>[] = [];
    if (scope !== "CATALOGUE" && approvedIds.length > 0) {
      fetched.push(...(await prisma.productMaster.findMany({ where: { id: { in: approvedIds.slice(0, 100) } }, include, orderBy: { name: "asc" } })));
    }
    if (scope !== "APPROVED") {
      const seen = new Set(fetched.map((r) => r.id));
      const rest = await prisma.productMaster.findMany({ where: { ...productWhere, ...(seen.size ? { id: { notIn: [...seen] } } : {}) }, include, orderBy: { name: "asc" }, take: 25 });
      fetched.push(...rest);
    }
    const rows = fetched.slice(0, 25);
    const pending = await this.pendingAmendmentIds(rows);
    const ctx = await attributionContext(user, rows.map((r) => r.addedByOrganizationId));
    return rows.map((r) => ({ ...this.toMatch(r, pending.has(r.id), ctx), orgApproval: statusOf.get(r.id) ?? null, approvedSources: (byProduct.get(r.id) ?? []).filter((x) => x.status === "APPROVED") }));
  }

  /** Full detail for a single catalogue entry, including the category's
   * dynamic attribute schema (ProductAttributeDefinition) — the picker uses
   * this once a product is selected, to render any category-specific
   * refinement fields (e.g. Cryovial -> size), stored on
   * ProjectLine.attributes. Zero attribute definitions are seeded today (no
   * importer built yet — see ProductAttributeDefinition's doc comment in
   * schema.prisma), so this returns an empty array until that's populated;
   * the plumbing is ready regardless. */
  async getOne(id: string, showSimulated = false, viewer?: RequestUser): Promise<ProductCatalogDetail | null> {
    const row = await prisma.productMaster.findUnique({
      where: { id },
      include: { addedByOrganization: { select: { name: true } }, productFamily: { select: { id: true, name: true, isSimulated: true, _count: { select: { variants: true } } } } },
    });
    if (!row || (row.isSimulated && !showSimulated)) return null;
    const family = row.productFamily && (!row.productFamily.isSimulated || showSimulated) ? row.productFamily : null;
    const siblings = family
      ? await prisma.productMaster.findMany({
          where: { productFamilyId: family.id, id: { not: row.id }, ...(showSimulated ? {} : { isSimulated: false }) },
          select: { id: true, name: true, variantLabel: true, strength: true, packSize: true, dosageForm: true, gtin: true, lifecycleStatus: true, isArchived: true },
          orderBy: { name: "asc" },
          take: 50,
        })
      : [];
    const attributeDefinitions = await prisma.productAttributeDefinition.findMany({
      where: { category: row.category },
      orderBy: { sortOrder: "asc" },
    });
    const pending = await this.pendingAmendmentIds([row]);
    const identifiers = await prisma.productIdentifier.findMany({
      where: { productMasterId: id },
      orderBy: [{ identifierType: "asc" }, { createdAt: "asc" }],
    });
    const ctx = await attributionContext(viewer, [row.addedByOrganizationId]);
    return {
      ...this.toMatch(row, pending.has(row.id), ctx),
      canonicalManufacturerPartNumber: row.canonicalManufacturerPartNumber,
      expectedQualityDocumentation: row.expectedQualityDocumentation,
      sourceStandard: row.sourceStandard,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      lifecycleReason: row.lifecycleReason,
      lifecycleChangedAt: row.lifecycleChangedAt ? row.lifecycleChangedAt.toISOString() : null,
      storageClass: row.storageClass,
      coldChain: row.coldChain,
      shelfLifeMonths: row.shelfLifeMonths,
      hazardClass: row.hazardClass,
      controlledSubstance: row.controlledSubstance,
      inn: row.inn,
      strength: row.strength,
      dosageForm: row.dosageForm,
      brand: row.brand,
      packSize: row.packSize,
      regulatoryClass: row.regulatoryClass,
      intendedUse: row.intendedUse,
      nextReviewDue: row.nextReviewDue ? row.nextReviewDue.toISOString() : null,
      version: row.version,
      identifiers: identifiers.map((i) => ({ id: i.id, identifierType: i.identifierType, value: i.value, label: i.label, packagingLevel: i.packagingLevel, unitsPerPack: i.unitsPerPack, isActive: i.isActive })),
      family: family ? { id: family.id, name: family.name, variantCount: family._count.variants } : null,
      variantLabel: row.variantLabel,
      siblings,
      completeness: computeCompleteness(row),
      compliance: computeCompliance(
        row.lifecycleStatus,
        await prisma.productRegulatoryRegistration.findMany({
          where: { isArchived: false, OR: family ? [{ productMasterId: id }, { productFamilyId: family.id }] : [{ productMasterId: id }] },
          select: { status: true, expiryDate: true, authority: true, referenceNumber: true },
        }),
      ),
      attributeDefinitions: attributeDefinitions.map((a) => ({
        attributeKey: a.attributeKey,
        label: a.label,
        dataType: a.dataType,
        enumOptions: a.enumOptions ? (JSON.parse(a.enumOptions) as string[]) : null,
        required: a.required,
      })),
    };
  }

  /** GET /product-catalog/:id/history — the shared change history (ProductMasterChange), newest first, capped at 300.
   * Readable by any signed-in user: it is the audit trail of the shared catalogue entry. Simulated products follow
   * the same ring-fence as getOne. */
  async getHistory(id: string, showSimulated = false, viewer?: RequestUser): Promise<ProductChangeEntry[]> {
    const product = await prisma.productMaster.findUnique({ where: { id }, select: { isSimulated: true, productFamilyId: true } });
    if (!product || (product.isSimulated && !showSimulated)) throw new NotFoundException("Product not found.");
    const rows = await prisma.productMasterChange.findMany({
      where: { productMasterId: id },
      orderBy: [{ changedAt: "desc" }, { version: "desc" }],
      take: 300,
    });
    const familyRows = product.productFamilyId
      ? await prisma.productFamilyChange.findMany({ where: { productFamilyId: product.productFamilyId }, orderBy: { changedAt: "desc" }, take: 100 })
      : [];
    const ctx = await attributionContext(viewer, [...rows.map((r) => r.changedByOrganizationId), ...familyRows.map((r) => r.changedByOrganizationId)]);
    const fromFamily = familyRows.map((r) => ({
      id: r.id, version: 0, fieldName: `Family: ${r.fieldName}`, oldValue: r.oldValue, newValue: r.newValue, source: r.source, reason: null as string | null,
      changedByName: maskContributor(ctx, r.changedByOrganizationId, r.changedByName).anonymised ? null : r.changedByName, changedByOrganizationName: maskContributor(ctx, r.changedByOrganizationId, r.changedByOrganizationName).name, changedAt: r.changedAt.toISOString(),
    }));
    const own = rows.map((r) => ({
      id: r.id,
      version: r.version,
      fieldName: r.fieldName,
      oldValue: r.oldValue,
      newValue: r.newValue,
      source: r.source,
      reason: r.reason,
      changedByName: maskContributor(ctx, r.changedByOrganizationId, r.changedByName).anonymised ? null : r.changedByName,
      changedByOrganizationName: maskContributor(ctx, r.changedByOrganizationId, r.changedByOrganizationName).name,
      changedAt: r.changedAt.toISOString(),
    }));
    return [...own, ...fromFamily].sort((a, b) => b.changedAt.localeCompare(a.changedAt)).slice(0, 300);
  }

  /** GET /product-catalog/:id/usage — how the caller's OWN organisation uses this product (tenant-scoped; never other
   * organisations' usage). Line and project counts plus the ten most recently updated projects. */
  async getUsage(user: RequestUser, id: string): Promise<ProductUsageSummary> {
    return withTenantContext(user.organizationId, async (tx) => {
      const lines = await tx.projectLine.findMany({
        where: { productMasterId: id, archivedAt: null, project: { organizationId: user.organizationId } },
        select: { projectId: true },
      });
      const perProject = new Map<string, number>();
      for (const l of lines) perProject.set(l.projectId, (perProject.get(l.projectId) ?? 0) + 1);
      const projects = perProject.size
        ? await tx.project.findMany({
            where: { id: { in: [...perProject.keys()] }, organizationId: user.organizationId },
            select: { id: true, referenceNumber: true, title: true, status: true },
            orderBy: { updatedAt: "desc" },
            take: 10,
          })
        : [];
      return {
        lineCount: lines.length,
        projectCount: perProject.size,
        recentProjects: projects.map((p) => ({ projectId: p.id, reference: p.referenceNumber, name: p.title, status: p.status, lineCount: perProject.get(p.id) ?? 0 })),
      };
    });
  }

  /** GET /product-catalog/:id/price-history — ProductPriceHistory rows
   * recorded against this ProductMaster, tenant-scoped to the caller's own
   * organisation. Unlike ProductMaster itself (globally readable, no
   * organizationId column), product_price_history IS RLS-protected (see
   * row-level-security.sql), so this goes through withTenantContext same
   * as ProductSourceApprovalsService — see that service's doc comment for
   * the general pattern. Added 2026-10-09: ProductPriceHistory existed in
   * schema.prisma with zero API/frontend exposure until now; this is pure
   * read-only plumbing, no write path yet. */
  async getPriceHistory(user: RequestUser, productMasterId: string): Promise<ProductPriceHistoryPoint[]> {
    const rows = await withTenantContext(user.organizationId, (tx) =>
      tx.productPriceHistory.findMany({
        where: { ...tenantScope(user.organizationId), productMasterId },
        include: { recordedBy: { select: { forename: true, surname: true } } },
        orderBy: { effectiveDate: "asc" },
      }),
    );
    return rows.map((r) => ({
      id: r.id,
      unitPrice: String(r.unitPrice),
      currency: r.currency,
      effectiveDate: r.effectiveDate.toISOString(),
      recordedByName: r.recordedBy ? `${r.recordedBy.forename} ${r.recordedBy.surname}` : null,
    }));
  }

  /** Paginated browse/search for the Product Database Management app's
   * catalogue screen — GET /product-catalog?q=&category=&sourceStandard=&page=&pageSize=.
   * Distinct from search() above: that's a 25-row typeahead for the inline
   * picker, this is the full list view with a real total count for
   * pagination. Added 2026-10-03. */
  async list(params: {
    viewer?: RequestUser;
    q?: string;
    category?: string;
    sourceStandard?: string;
    page?: number;
    pageSize?: number;
    /** Added 2026-10-03 for the catalogue screen's archive functionality —
     * archived entries stay excluded by default unless the caller
     * explicitly asks for them, e.g. the "Show archived" toggle on the
     * browse screen. */
    includeArchived?: boolean;
    /** Added 2026-10-09 — Stage 0 point 3 (data completeness pass). Lets
     * the catalogue screen's completeness tiles double as filters: click
     * "Missing GTIN" and the list narrows to exactly the rows that need
     * one. One field at a time (not a combined "missing anything" mode)
     * since each field is its own work queue for whoever's filling it in. */
    missingField?: "gtin" | "hsCode" | "unspscCode" | "standardUnit";
    /** Simulated (scale-test) entries are visible only inside a demo organisation. */
    showSimulated?: boolean;
  }): Promise<ProductCatalogListResult> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const pageSize = params.pageSize && params.pageSize > 0 && params.pageSize <= 200 ? params.pageSize : 50;
    // Explicit per-field mapping rather than a computed `{ [params.missingField]: null }`
    // spread — keeps this trivially type-checkable against Prisma's
    // ProductMasterWhereInput rather than relying on TS inferring a
    // discriminated-union shape from a dynamic key.
    const missingFieldWhere: Record<string, null> =
      params.missingField === "gtin"
        ? { gtin: null }
        : params.missingField === "hsCode"
          ? { hsCode: null }
          : params.missingField === "unspscCode"
            ? { unspscCode: null }
            : params.missingField === "standardUnit"
              ? { standardUnit: null }
              : {};
    const where = {
      ...simulatedFilter(params.showSimulated),
      ...(params.includeArchived ? {} : { isArchived: false }),
      ...(params.q && params.q.trim() ? { name: { contains: params.q.trim() } } : {}),
      ...(params.category ? { category: { startsWith: params.category } } : {}),
      ...(params.sourceStandard ? { sourceStandard: params.sourceStandard } : {}),
      ...missingFieldWhere,
    };
    const [rows, total] = await Promise.all([
      prisma.productMaster.findMany({
        where,
        include: { addedByOrganization: { select: { name: true } } },
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.productMaster.count({ where }),
    ]);
    const pending = await this.pendingAmendmentIds(rows);
    const ctx = await attributionContext(params.viewer, rows.map((r) => r.addedByOrganizationId));
    return { items: rows.map((r) => this.toMatch(r, pending.has(r.id), ctx)), total, page, pageSize };
  }

  /** GET /product-catalog/completeness-stats — product-database-and-map-
   * roadmap.md Stage 0 point 3 (data completeness pass), added 2026-10-09.
   * Scoped to non-archived entries, same default as list()'s own default
   * view. Four independent counts, not one "% complete" score — see
   * ProductCatalogCompletenessStats's doc comment in @universe/types for
   * why (GTIN and friends are legitimately absent on some entries, not
   * universally required). */
  async getCompletenessStats(showSimulated = false): Promise<ProductCatalogCompletenessStats> {
    const where = { isArchived: false, ...simulatedFilter(showSimulated) };
    const [total, missingGtin, missingHsCode, missingUnspscCode, missingStandardUnit] = await Promise.all([
      prisma.productMaster.count({ where }),
      prisma.productMaster.count({ where: { ...where, gtin: null } }),
      prisma.productMaster.count({ where: { ...where, hsCode: null } }),
      prisma.productMaster.count({ where: { ...where, unspscCode: null } }),
      prisma.productMaster.count({ where: { ...where, standardUnit: null } }),
    ]);
    return { total, missingGtin, missingHsCode, missingUnspscCode, missingStandardUnit };
  }

  /** GET /product-catalog/dashboard-stats — the catalogue's standardised
   * section mini-dashboard, product-database-and-map-roadmap.md Stage 1,
   * added 2026-10-09: the same StatTile/StatTileGrid pattern already used
   * everywhere else (see ProductCatalogDashboardStats's doc comment in
   * @universe/types), applied here for the first time. Scoped to
   * non-archived entries, same as completeness-stats above.
   *
   * `category` is a hierarchical "Group.Subgroup" path (see
   * ProductMaster.category's doc comment in schema.prisma, e.g.
   * "Personal Protective Equipment.Masks") — `byCategory` is deliberately
   * collapsed to just the top-level group ("Personal Protective
   * Equipment"), matching the frontend's existing CATEGORIES filter list
   * and list()'s own `category: { startsWith }` match, not the full
   * dotted path. Fixed 2026-10-09 after Lewis flagged the breakdown
   * showing one chip per Group.Subgroup pair instead of one per
   * top-level group. `groupBy` still runs on the full `category` column
   * (one query, bounded by the number of distinct categories — small),
   * then the top-level collapse + count-summing happens in JS, since
   * Prisma's groupBy can't split a column's value mid-query. */
  async getDashboardStats(showSimulated = false): Promise<ProductCatalogDashboardStats> {
    const where = { isArchived: false, ...simulatedFilter(showSimulated) };
    const [total, addedLast30Days, grouped] = await Promise.all([
      prisma.productMaster.count({ where }),
      prisma.productMaster.count({
        where: { ...where, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.productMaster.groupBy({
        by: ["category"],
        where,
        _count: { _all: true },
      }),
    ]);
    const topLevelCounts = new Map<string, number>();
    for (const g of grouped) {
      const topLevel = g.category.split(".")[0];
      topLevelCounts.set(topLevel, (topLevelCounts.get(topLevel) ?? 0) + g._count._all);
    }
    const byCategory = Array.from(topLevelCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
    return { total, addedLast30Days, byCategory };
  }

  /** PATCH /product-catalog/:id — edits an existing entry. Added
   * 2026-10-03; rewritten 2026-10-09 for the catalogue edit-rights +
   * ratification workflow (product-database-and-map-roadmap.md Stage 0
   * point 1 — Lewis's explicit design, quoted in full):
   *
   *   "no editing rights for anyone for any product that wasn't created
   *   by their parent organisation. for products that were created from
   *   within their parent organisation account, amendments can be made by
   *   project managers and quality assurance/RPs (plus admins), however
   *   all changes must be ratified by quality assurance/RP designated
   *   users before those products can be used on a project line" — and
   *   the immediate follow-up correcting my own assumption: "can add the
   *   product with a warning" (non-blocking, see hasPendingAmendment).
   *
   * Gating, in order:
   *   1. Platform staff — applies directly, no amendment row, exactly the
   *      old behaviour. Universe's own operating team isn't expected to
   *      hold every tenant's own role to support a customer (same
   *      reasoning as assertHasPermission's platform-staff bypass).
   *   2. Not platform staff, and the row wasn't added by the caller's own
   *      organisation — Forbidden outright, no amendment created either:
   *      this org has NO editing rights over this product, full stop.
   *   3. Same org, but the caller holds neither `projects.edit` nor
   *      `products.approve` (no single existing permission key covers
   *      both Project Manager and QA/RP/Admin — see
   *      packages/db/src/organizations.ts's DEFAULT_ROLE_TEMPLATE) —
   *      Forbidden.
   *   4. Same org, permission held — NOT applied directly. A PENDING
   *      ProductAmendment row is created instead; the live ProductMaster
   *      row is untouched until a QA/RP user ratifies it (see
   *      ratifyAmendment below). Provenance fields
   *      (sourceStandard/addedByOrganizationId/Type) were never editable
   *      here to begin with — UpdateProductMasterDto still excludes them.
   */
  async update(user: RequestUser, id: string, dto: UpdateProductMasterDto): Promise<UpdateProductMasterResult> {
    const existing = await prisma.productMaster.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Product not found.");

    if (user.platformStaffRole !== "NONE") {
      const updated = await prisma.$transaction(async (tx) => {
        await applyProductChangeSet(tx, id, dto, { source: "STAFF_EDIT", user });
        return tx.productMaster.findUniqueOrThrow({ where: { id }, include: { addedByOrganization: { select: { name: true } } } });
      });
      const pending = await this.pendingAmendmentIds([updated]);
      return { status: "APPLIED", product: this.toMatch(updated, pending.has(updated.id), await attributionContext(user, [updated.addedByOrganizationId])) };
    }

    if (existing.addedByOrganizationId !== user.organizationId) {
      throw new ForbiddenException(
        "Only the organisation that originally added this product may propose changes to it.",
      );
    }
    if (!user.permissions.includes("projects.edit") && !user.permissions.includes("products.approve")) {
      throw new ForbiddenException(
        "Missing permission: amendments require projects.edit or products.approve.",
      );
    }

    const amendment = await withTenantContext(user.organizationId, async (tx) => {
      const created = await tx.productAmendment.create({
        data: {
          organizationId: user.organizationId,
          productMasterId: id,
          proposedChanges: JSON.stringify(dto),
          status: "PENDING",
          submittedById: user.id,
        },
      });
      // Ask the QA reviewers (products.approve) to ratify or reject it.
      const reviewers = await usersWithPermission(tx, user.organizationId, "products.approve", user.id);
      await createNotifications(
        tx,
        reviewers.map((rid) => ({
          organizationId: user.organizationId,
          recipientUserId: rid,
          actorUserId: user.id,
          kind: "AMENDMENT_REVIEW",
          category: "QUALITY",
          title: `Review proposed change to ${existing.name}`,
          body: `${user.forename} ${user.surname} proposed an amendment to this product.`,
          link: "/quality/product-amendments",
          subjectType: "product_amendment",
          subjectId: created.id,
          requiresAction: true,
        })),
      );
      return created;
    });
    return { status: "PENDING_AMENDMENT", amendmentId: amendment.id };
  }

  /** GET /product-catalog/:id/amendments — every ProductAmendment ever
   * submitted against this product, tenant-scoped to the caller's own
   * organisation (the only org that could ever have submitted one, by
   * construction — see update()'s same-org gate above). Added 2026-10-09,
   * mainly so a product's own detail screen can show its amendment
   * history alongside the live-queue view in QaQueueService. */
  async listAmendments(user: RequestUser, productMasterId: string): Promise<ProductAmendmentSummary[]> {
    const rows = await withTenantContext(user.organizationId, (tx) =>
      tx.productAmendment.findMany({
        where: { ...tenantScope(user.organizationId), productMasterId },
        include: {
          productMaster: { select: { name: true } },
          organization: { select: { name: true } },
          submittedBy: { select: { forename: true, surname: true } },
          reviewedBy: { select: { forename: true, surname: true } },
        },
        orderBy: { submittedAt: "desc" },
      }),
    );
    return rows.map((r) => this.toAmendmentSummary(r));
  }

  /** GET /product-catalog/amendments/:id — a single amendment, tenant-
   * scoped to the caller's own organisation (same RLS reasoning as
   * ratifyAmendment/rejectAmendment below — this is a bare lookup by id,
   * not scoped to a known productMasterId the way listAmendments is, so
   * it has to run inside withTenantContext too). Added 2026-10-09 for the
   * QA Queue's "Review amendment" deep link. */
  async getAmendment(user: RequestUser, amendmentId: string): Promise<ProductAmendmentSummary> {
    const row = await withTenantContext(user.organizationId, (tx) =>
      tx.productAmendment.findFirst({
        where: { ...tenantScope(user.organizationId), id: amendmentId },
        include: {
          productMaster: { select: { name: true } },
          organization: { select: { name: true } },
          submittedBy: { select: { forename: true, surname: true } },
          reviewedBy: { select: { forename: true, surname: true } },
        },
      }),
    );
    if (!row) throw new NotFoundException("Amendment not found.");
    return this.toAmendmentSummary(row);
  }

  /** POST /product-catalog/amendments/:id/ratify — applies the proposed
   * changes to the live ProductMaster row and marks the amendment
   * APPROVED. Gated on `products.approve` (QA/RP/Admin — see
   * DEFAULT_ROLE_TEMPLATE), same permission key the rest of the QA/
   * procurement segregation-of-duties work uses (ProductSourceApproval,
   * StakeholderEvidenceRecord). Everything here — the initial lookup
   * included — runs inside ONE withTenantContext(user.organizationId,
   * ...) transaction, never a bare `prisma.productAmendment` call:
   * product_amendments IS RLS-protected (unlike product_master itself),
   * so a bare lookup with no session context set would silently return
   * nothing at all (RLS's default-deny), not an unfiltered row. This also
   * means a QA/RP user can only ever ratify an amendment belonging to
   * THEIR OWN organisation — exactly right, since an amendment's
   * organizationId is always the same org that both added the product
   * and proposed the change (see update()'s same-org gate); a mismatched
   * org gets a 404, not a permission error, so existence isn't leaked
   * cross-tenant either. */
  async ratifyAmendment(user: RequestUser, amendmentId: string): Promise<ProductAmendmentSummary> {
    assertNotDemoUser(user, "Ratifying a product amendment (it changes the shared catalogue)");
    assertHasPermission(user, "products.approve");

    const updated = await withTenantContext(user.organizationId, async (tx) => {
      const existing = await tx.productAmendment.findFirst({
        where: { ...tenantScope(user.organizationId), id: amendmentId },
      });
      if (!existing) throw new NotFoundException("Amendment not found.");
      if (existing.status !== "PENDING") throw new ForbiddenException("This amendment has already been reviewed.");

      const proposed = JSON.parse(existing.proposedChanges) as UpdateProductMasterInput;
      const before = await tx.productMaster.findUnique({ where: { id: existing.productMasterId } });
      if (!before) throw new NotFoundException("Product not found.");

      const changes = diffProductRecord(before, proposed);
      await applyProductChangeSet(tx, existing.productMasterId, proposed, {
        source: "AMENDMENT_RATIFIED",
        user,
        reason: "Product amendment ratified",
        amendmentId,
      });
      await recordFieldChanges(tx, {
        organizationId: existing.organizationId,
        tableName: "product_master",
        recordId: existing.productMasterId,
        changedById: user.id,
        changes,
        reason: "Product amendment ratified",
      });
      const result = await tx.productAmendment.update({
        where: { id: amendmentId },
        data: { status: "APPROVED", reviewedById: user.id, reviewedAt: new Date() },
        include: {
          productMaster: { select: { name: true } },
          organization: { select: { name: true } },
          submittedBy: { select: { forename: true, surname: true } },
          reviewedBy: { select: { forename: true, surname: true } },
        },
      });
      await completeActionsFor(tx, user.organizationId, "product_amendment", amendmentId);
      if (existing.submittedById !== user.id) {
        await createNotifications(tx, [
          {
            organizationId: user.organizationId,
            recipientUserId: existing.submittedById,
            actorUserId: user.id,
            kind: "AMENDMENT_DECISION",
            category: "QUALITY",
            title: `Your proposed change was "approved"`,
            body: `${user.forename} ${user.surname} ratified your amendment to ${before.name}.`,
            link: "/quality/product-amendments",
            subjectType: "product_amendment",
            subjectId: amendmentId,
          },
        ]);
      }
      return result;
    });

    return this.toAmendmentSummary(updated);
  }

  /** POST /product-catalog/amendments/:id/reject — marks the amendment
   * REJECTED with the reviewer's notes; the live ProductMaster row is
   * never touched. Same `products.approve` gate and same
   * single-transaction/RLS reasoning as ratifyAmendment above. */
  async rejectAmendment(
    user: RequestUser,
    amendmentId: string,
    dto: RejectProductAmendmentDto,
  ): Promise<ProductAmendmentSummary> {
    assertHasPermission(user, "products.approve");

    const updated = await withTenantContext(user.organizationId, async (tx) => {
      const existing = await tx.productAmendment.findFirst({
        where: { ...tenantScope(user.organizationId), id: amendmentId },
      });
      if (!existing) throw new NotFoundException("Amendment not found.");
      if (existing.status !== "PENDING") throw new ForbiddenException("This amendment has already been reviewed.");

      const result = await tx.productAmendment.update({
        where: { id: amendmentId },
        data: {
          status: "REJECTED",
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewNotes: dto.notes ?? null,
        },
        include: {
          productMaster: { select: { name: true } },
          organization: { select: { name: true } },
          submittedBy: { select: { forename: true, surname: true } },
          reviewedBy: { select: { forename: true, surname: true } },
        },
      });
      await completeActionsFor(tx, user.organizationId, "product_amendment", amendmentId);
      if (existing.submittedById !== user.id) {
        await createNotifications(tx, [
          {
            organizationId: user.organizationId,
            recipientUserId: existing.submittedById,
            actorUserId: user.id,
            kind: "AMENDMENT_DECISION",
            category: "QUALITY",
            title: `Your proposed change was "rejected"`,
            body: `${user.forename} ${user.surname} rejected it${dto.notes ? ` — ${dto.notes}` : ""}.`,
            link: "/quality/product-amendments",
            subjectType: "product_amendment",
            subjectId: amendmentId,
          },
        ]);
      }
      return result;
    });
    return this.toAmendmentSummary(updated);
  }

  /** POST /product-catalog/import — bulk upsert for reference-data
   * importers (HS codes, WHO EML, UNSPSC, GS1 GTIN). See
   * ImportProductMasterDto's doc comment for why this exists and what it
   * is/isn't. Idempotent: a row is matched against an existing entry with
   * the SAME sourceStandard and the same code value on whichever field
   * that standard uses (hsCode for HS_CODE, unspscCode for UNSPSC, gtin
   * for GS1_GTIN; WHO_EML has no single natural code column today, so it
   * matches on sourceStandard + exact name instead — acceptable for a v1
   * re-run-safe importer, worth revisiting if WHO EML's own code field
   * gets modelled later). A match updates in place; no match creates a new
   * row. Rows with neither a usable match key nor a name are skipped, not
   * silently dropped — reported back in the result. Added 2026-10-03. */
  async importBatch(
    user: RequestUser,
    sourceStandard: string,
    rows: ImportProductMasterRowDto[],
  ): Promise<ImportProductMasterResult> {
    assertNotDemoUser(user, "Importing products into the shared catalogue");
    const org = await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { type: true } });
    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.name?.trim() || !row.category?.trim()) {
        skipped++;
        errors.push({ row: i, message: "Missing required name/category — skipped." });
        continue;
      }

      try {
        // Explicit per-standard branches rather than a computed Prisma
        // `where` key — keeps this typecheckable against the generated
        // Prisma client (a bracket-notation key here can't be verified
        // against ProductMasterWhereInput at compile time, and this
        // environment has no way to run `tsc` against the real generated
        // client locally — see the build's standing verification caveat).
        let existing: Awaited<ReturnType<typeof prisma.productMaster.findFirst>> = null;
        if (sourceStandard === "HS_CODE" && row.hsCode) {
          existing = await prisma.productMaster.findFirst({ where: { sourceStandard, hsCode: row.hsCode } });
        } else if (sourceStandard === "UNSPSC" && row.unspscCode) {
          existing = await prisma.productMaster.findFirst({ where: { sourceStandard, unspscCode: row.unspscCode } });
        } else if (sourceStandard === "GS1_GTIN" && row.gtin) {
          existing = await prisma.productMaster.findFirst({ where: { sourceStandard, gtin: row.gtin } });
        } else {
          existing = await prisma.productMaster.findFirst({ where: { sourceStandard, name: row.name.trim() } });
        }

        if (existing) {
          await prisma.$transaction((tx) =>
            applyProductChangeSet(
              tx,
              existing!.id,
              {
                name: row.name,
                category: row.category,
                hsCode: row.hsCode ?? existing!.hsCode ?? undefined,
                unspscCode: row.unspscCode ?? existing!.unspscCode ?? undefined,
                gtin: row.gtin ?? existing!.gtin ?? undefined,
                standardUnit: row.standardUnit ?? existing!.standardUnit ?? undefined,
              },
              { source: "IMPORT", user, reason: `Import (${sourceStandard})` },
            ),
          );
          updated++;
        } else {
          const made = await prisma.productMaster.create({
            data: {
              name: row.name,
              category: row.category,
              hsCode: row.hsCode,
              unspscCode: row.unspscCode,
              gtin: row.gtin,
              standardUnit: row.standardUnit,
              sourceStandard,
              isSimulated: user.inDemoOrganization === true,
              addedByOrganizationId: user.organizationId,
              addedByOrganizationType: org?.type ?? null,
            },
          });
          await writeProductChanges(prisma, {
            productMasterId: made.id,
            version: 1,
            changes: [{ field: "(created)", oldValue: null, newValue: made.name }],
            source: "IMPORT",
            user,
            reason: `Import (${sourceStandard})`,
          });
          created++;
        }
      } catch (err) {
        skipped++;
        errors.push({ row: i, message: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    return { created, updated, skipped, errors };
  }

  /** Adds a new entry to the shared catalogue — POST /product-catalog. Only
   * ever an explicit action from the UI (the search-or-create picker shows
   * existing matches first); there's no matching/dedup logic here the way
   * StakeholderRegistryService.matchOrCreate has it for company names — a
   * product-name collision isn't the same identity question a company-name
   * collision is (plenty of distinct real products legitimately share a
   * name), so de-duplication is intentionally left to the human who already
   * saw the search results, not guessed at server-side. */
  /**
   * Adds a product to the shared catalogue. Step 3b follow-up (2026-10-18): a product is normally a VARIANT of a family
   * (generic name + strength/pack size), so pass `familyId` + `variantLabel` and the name is derived; any organisation can
   * add a variant to an existing family, and only platform staff can create a new family (`newFamilyName`, resolved in
   * the controller). Duplicates are refused rather than merged: the same GTIN anywhere in the catalogue, the same variant
   * label within a family, or (for a standalone product) the same name. The refusal names the existing product so the
   * caller can select it instead.
   */
  async create(user: RequestUser, dto: CreateProductMasterDto): Promise<ProductCatalogMatch> {
    assertNotDemoUser(user, "Adding a product to the shared catalogue");
    const org = await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { type: true } });
    const clean = (v?: string) => (v && v.trim() ? v.trim() : undefined);
    const family = dto.familyId
      ? await prisma.productFamily.findUnique({ where: { id: dto.familyId }, select: { id: true, name: true, category: true, brand: true, inn: true, regulatoryClass: true, isArchived: true, isSimulated: true } })
      : null;
    if (dto.familyId && (!family || family.isArchived)) throw new BadRequestException("That product family was not found or is archived.");
    const variantLabel = clean(dto.variantLabel);
    if (family && !variantLabel) throw new BadRequestException("Enter a variant label, for example '500 mg, 20 tablets'.");
    const name = family ? `${family.name}, ${variantLabel}` : clean(dto.name);
    if (!name) throw new BadRequestException("Enter a product name, or choose a family and a variant.");

    // Duplicate prevention.
    const gtins = [...new Set([clean(dto.gtin), ...(dto.identifiers ?? []).map((i) => clean(i.value))].filter((v): v is string => Boolean(v)))];
    if (gtins.length > 0) {
      const hit =
        (await prisma.productIdentifier.findFirst({ where: { identifierType: "GTIN", value: { in: gtins } }, select: { value: true, productMaster: { select: { id: true, name: true } } } })) ??
        null;
      const hitMaster = hit ? null : await prisma.productMaster.findFirst({ where: { gtin: { in: gtins } }, select: { id: true, name: true, gtin: true } });
      if (hit) throw new ConflictException({ message: `GTIN ${hit.value} is already in the catalogue as "${hit.productMaster.name}". Select that product instead.`, existingProductId: hit.productMaster.id });
      if (hitMaster) throw new ConflictException({ message: `GTIN ${hitMaster.gtin} is already in the catalogue as "${hitMaster.name}". Select that product instead.`, existingProductId: hitMaster.id });
    }
    if (family) {
      const dup = await prisma.productMaster.findFirst({ where: { productFamilyId: family.id, isArchived: false, variantLabel }, select: { id: true, name: true } });
      if (dup) throw new ConflictException({ message: `"${dup.name}" already exists in this family. Select it instead of adding it again.`, existingProductId: dup.id });
    } else {
      const dup = await prisma.productMaster.findFirst({ where: { name, isArchived: false }, select: { id: true, name: true } });
      if (dup) throw new ConflictException({ message: `"${dup.name}" is already in the catalogue. Select it instead of adding it again.`, existingProductId: dup.id });
    }

    const units = (dto.identifiers ?? []).find((i) => i.packagingLevel === "UNIT")?.value;
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.productMaster.create({
        data: {
          name,
          category: family?.category ?? dto.category,
          hsCode: dto.hsCode,
          unspscCode: dto.unspscCode,
          gtin: clean(dto.gtin) ?? clean(units),
          standardUnit: dto.standardUnit,
          canonicalManufacturerPartNumber: dto.canonicalManufacturerPartNumber,
          expectedQualityDocumentation: dto.expectedQualityDocumentation,
          brand: clean(dto.brand) ?? family?.brand ?? undefined,
          inn: clean(dto.inn) ?? family?.inn ?? undefined,
          strength: clean(dto.strength),
          dosageForm: clean(dto.dosageForm),
          packSize: clean(dto.packSize),
          regulatoryClass: clean(dto.regulatoryClass) ?? family?.regulatoryClass ?? undefined,
          productFamilyId: family?.id ?? null,
          variantLabel: variantLabel ?? null,
          sourceStandard: "INTERNAL",
          isSimulated: user.inDemoOrganization === true,
          addedByOrganizationId: user.organizationId,
          addedByOrganizationType: org?.type ?? null,
          attributionOverride: typeof dto.showContributor === "boolean" ? dto.showContributor : null,
        },
        include: { addedByOrganization: { select: { name: true } }, productFamily: { select: { id: true, name: true } } },
      });
      const idRows = (dto.identifiers ?? []).filter((i) => clean(i.value)).map((i) => ({ productMasterId: row.id, identifierType: "GTIN", value: i.value.trim(), packagingLevel: i.packagingLevel, unitsPerPack: i.unitsPerPack ?? null, createdById: user.id }));
      if (idRows.length > 0) await tx.productIdentifier.createMany({ data: idRows });
      await writeProductChanges(tx, { productMasterId: row.id, version: 1, changes: [{ field: "(created)", oldValue: null, newValue: row.name }], source: "CREATE", user });
      if (family) await writeTargetChanges(tx, { productMasterId: null, productFamilyId: family.id }, { version: 0, changes: [{ field: "variant added", oldValue: null, newValue: row.name }], source: "CREATE", user });
      return row;
    });
    return this.toMatch(created, false, await attributionContext(user, [created.addedByOrganizationId]));
  }

  /** Groups the given rows by addedByOrganizationId and, per org, checks
   * for a PENDING ProductAmendment among those ids — returning the set of
   * productMasterIds that have one. product_amendments IS RLS-protected
   * (see row-level-security.sql), but a row's organizationId is always
   * the SAME organisation as the product's own addedByOrganizationId (see
   * update()'s same-org gate — an amendment can only ever be submitted by
   * the org that added the product), so scoping each lookup to that
   * product's own owning org — rather than the viewing caller's org —
   * correctly surfaces the warning to ANY viewer (e.g. a different
   * organisation's user browsing the shared catalogue, per Lewis's
   * "can add the product with a warning" instruction) without ever
   * returning another organisation's row contents, only this one boolean
   * per id. Rows with no addedByOrganizationId (the originally-seeded
   * reference data) can never have an amendment and are skipped. One
   * withTenantContext transaction per distinct owning org represented in
   * the page of results — acceptable at this platform's current scale;
   * worth revisiting if a single search/list page routinely spans dozens
   * of contributing organisations. */
  private async pendingAmendmentIds(rows: { id: string; addedByOrganizationId: string | null }[]): Promise<Set<string>> {
    const byOrg = new Map<string, string[]>();
    for (const r of rows) {
      if (!r.addedByOrganizationId) continue;
      const ids = byOrg.get(r.addedByOrganizationId) ?? [];
      ids.push(r.id);
      byOrg.set(r.addedByOrganizationId, ids);
    }
    const pending = new Set<string>();
    await Promise.all(
      [...byOrg.entries()].map(([orgId, ids]) =>
        withTenantContext(orgId, (tx) =>
          tx.productAmendment.findMany({
            where: { organizationId: orgId, productMasterId: { in: ids }, status: "PENDING" },
            select: { productMasterId: true },
          }),
        ).then((found) => found.forEach((f) => pending.add(f.productMasterId))),
      ),
    );
    return pending;
  }

  private toAmendmentSummary(row: {
    id: string;
    productMasterId: string;
    productMaster: { name: string };
    organizationId: string;
    organization: { name: string };
    proposedChanges: string;
    status: string;
    submittedById: string;
    submittedBy: { forename: string; surname: string };
    submittedAt: Date;
    reviewedById: string | null;
    reviewedBy: { forename: string; surname: string } | null;
    reviewedAt: Date | null;
    reviewNotes: string | null;
  }): ProductAmendmentSummary {
    return {
      id: row.id,
      productMasterId: row.productMasterId,
      productMasterName: row.productMaster.name,
      organizationId: row.organizationId,
      organizationName: row.organization.name,
      proposedChanges: JSON.parse(row.proposedChanges) as UpdateProductMasterInput,
      status: row.status as "PENDING" | "APPROVED" | "REJECTED",
      submittedById: row.submittedById,
      submittedByName: `${row.submittedBy.forename} ${row.submittedBy.surname}`,
      submittedAt: row.submittedAt.toISOString(),
      reviewedById: row.reviewedById,
      reviewedByName: row.reviewedBy ? `${row.reviewedBy.forename} ${row.reviewedBy.surname}` : null,
      reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
      reviewNotes: row.reviewNotes,
    };
  }

  private toMatch(
    row: {
      id: string;
      name: string;
      category: string;
      hsCode: string | null;
      unspscCode: string | null;
      gtin: string | null;
      standardUnit: string | null;
      isArchived: boolean;
      lifecycleStatus: string;
      addedByOrganizationId: string | null;
      addedByOrganization: { name: string } | null;
      attributionOverride?: boolean | null;
      productFamily?: { id: string; name: string } | null;
      variantLabel?: string | null;
      packSize?: string | null;
      strength?: string | null;
      brand?: string | null;
    },
    hasPendingAmendment: boolean,
    ctx?: AttributionContext,
  ): ProductCatalogMatch {
    // Pooled-database rule: contributors are anonymous to other organisations unless they have chosen to be identifiable.
    const who = maskContributor(ctx ?? { viewerOrgId: null, staff: false, visible: new Set() }, row.addedByOrganizationId, row.addedByOrganization?.name, row.attributionOverride);
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      hsCode: row.hsCode,
      unspscCode: row.unspscCode,
      gtin: row.gtin,
      standardUnit: row.standardUnit,
      addedByOrganizationName: who.name,
      addedByOrganizationId: who.id,
      contributorAnonymised: who.anonymised,
      isArchived: row.isArchived,
      lifecycleStatus: row.lifecycleStatus,
      hasPendingAmendment,
      familyId: row.productFamily?.id ?? null,
      familyName: row.productFamily?.name ?? null,
      variantLabel: row.variantLabel ?? null,
      packSize: row.packSize ?? null,
      strength: row.strength ?? null,
      brand: row.brand ?? null,
    };
  }
}
