import { Injectable } from "@nestjs/common";
import { prisma } from "@universe/db";
import type { ProductCatalogDetail, ProductCatalogMatch } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { CreateProductMasterDto } from "./dto/create-product-master.dto";

/**
 * The shared, central product catalogue (ProductMaster) — search-or-create,
 * the same reusable pattern as StakeholderRegistryService (see that file's
 * doc comment for the general shape): typeahead search first, an explicit
 * "add it" action second, never a silent auto-merge. `product_master`
 * carries no organizationId column and is deliberately excluded from
 * row-level-security.sql, so every method here is bare `prisma`, no
 * withTenantContext — same reasoning product-source-approvals.service.ts
 * already documented for this table. That service's own searchProducts now
 * delegates to search() below rather than duplicating the query.
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
 * comment in schema.prisma. It is never used to gate visibility:
 * ProductMaster search/read stays open to every organisation, same as
 * today. This is a deliberate contrast with StakeholderRegistryEntry, where
 * identity IS gated behind consent — products and stakeholders follow
 * different visibility rules by design (roadmap doc Section B vs B3).
 */
@Injectable()
export class ProductCatalogService {
  /** Typeahead search — GET /product-catalog/search?q=&category=. Shared by
   * the Project Management line-item picker, the Quality module's existing
   * "new approval" product field, and, going forward, CRM/Supplier
   * Portal. */
  async search(q: string | undefined, category?: string): Promise<ProductCatalogMatch[]> {
    const rows = await prisma.productMaster.findMany({
      where: {
        isArchived: false,
        ...(q && q.trim() ? { name: { contains: q.trim() } } : {}),
        ...(category ? { category } : {}),
      },
      include: { addedByOrganization: { select: { name: true } } },
      orderBy: { name: "asc" },
      take: 25,
    });
    return rows.map((r) => this.toMatch(r));
  }

  /** Full detail for a single catalogue entry, including the category's
   * dynamic attribute schema (ProductAttributeDefinition) — the picker uses
   * this once a product is selected, to render any category-specific
   * refinement fields (e.g. Cryovial -> size), stored on
   * ProjectLine.attributes. Zero attribute definitions are seeded today (no
   * importer built yet — see ProductAttributeDefinition's doc comment in
   * schema.prisma), so this returns an empty array until that's populated;
   * the plumbing is ready regardless. */
  async getOne(id: string): Promise<ProductCatalogDetail | null> {
    const row = await prisma.productMaster.findUnique({
      where: { id },
      include: { addedByOrganization: { select: { name: true } } },
    });
    if (!row) return null;
    const attributeDefinitions = await prisma.productAttributeDefinition.findMany({
      where: { category: row.category },
      orderBy: { sortOrder: "asc" },
    });
    return {
      ...this.toMatch(row),
      canonicalManufacturerPartNumber: row.canonicalManufacturerPartNumber,
      expectedQualityDocumentation: row.expectedQualityDocumentation,
      attributeDefinitions: attributeDefinitions.map((a) => ({
        attributeKey: a.attributeKey,
        label: a.label,
        dataType: a.dataType,
        enumOptions: a.enumOptions ? (JSON.parse(a.enumOptions) as string[]) : null,
        required: a.required,
      })),
    };
  }

  /** Adds a new entry to the shared catalogue — POST /product-catalog. Only
   * ever an explicit action from the UI (the search-or-create picker shows
   * existing matches first); there's no matching/dedup logic here the way
   * StakeholderRegistryService.matchOrCreate has it for company names — a
   * product-name collision isn't the same identity question a company-name
   * collision is (plenty of distinct real products legitimately share a
   * name), so de-duplication is intentionally left to the human who already
   * saw the search results, not guessed at server-side. */
  async create(user: RequestUser, dto: CreateProductMasterDto): Promise<ProductCatalogMatch> {
    const org = await prisma.organization.findUnique({ where: { id: user.organizationId }, select: { type: true } });
    const created = await prisma.productMaster.create({
      data: {
        name: dto.name,
        category: dto.category,
        hsCode: dto.hsCode,
        unspscCode: dto.unspscCode,
        gtin: dto.gtin,
        standardUnit: dto.standardUnit,
        canonicalManufacturerPartNumber: dto.canonicalManufacturerPartNumber,
        expectedQualityDocumentation: dto.expectedQualityDocumentation,
        sourceStandard: "INTERNAL",
        addedByOrganizationId: user.organizationId,
        addedByOrganizationType: org?.type ?? null,
      },
      include: { addedByOrganization: { select: { name: true } } },
    });
    return this.toMatch(created);
  }

  private toMatch(row: {
    id: string;
    name: string;
    category: string;
    hsCode: string | null;
    unspscCode: string | null;
    gtin: string | null;
    standardUnit: string | null;
    addedByOrganization: { name: string } | null;
  }): ProductCatalogMatch {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      hsCode: row.hsCode,
      unspscCode: row.unspscCode,
      gtin: row.gtin,
      standardUnit: row.standardUnit,
      addedByOrganizationName: row.addedByOrganization?.name ?? null,
    };
  }
}
