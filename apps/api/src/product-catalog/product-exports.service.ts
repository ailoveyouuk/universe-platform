import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma, withTenantContext } from "@universe/db";
import type { ProductDossier, ProductExportFile } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { recordFieldChanges } from "../common/audit-log";
import { attributionContext, maskContributor } from "./attribution";
import { ExportRestrictionsService } from "./export-restrictions.service";
import { ProductCatalogService } from "./product-catalog.service";
import { ProductDocumentsService } from "./product-documents.service";
import { ProductRegistrationsService } from "./product-registrations.service";
import { ProductSafetyNoticesService } from "./product-safety-notices.service";
import { productTarget } from "./product-target";

/** Hard ceiling on one export, so a single request stays bounded; the file says when it was cut off. */
export const EXPORT_ROW_LIMIT = 50000;
const PAGE = 500;

/** Spreadsheet-safe CSV cell: quotes where needed, and a leading apostrophe on anything a spreadsheet would run as a formula. */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export const csvRow = (cells: unknown[]) => cells.map(csvCell).join(",");

const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

/**
 * Product Database exports (step 5, 2026-10-18). Every export respects what the caller may see: simulated records only inside a
 * demo organisation, contributors anonymised under the pooled-database rule, the caller's own organisation's verifications and
 * reviews only. Each export is written to the organisation's audit trail (who, what, how many rows, filters).
 */
@Injectable()
export class ProductExportsService {
  constructor(
    private readonly catalogue: ProductCatalogService,
    private readonly registrations: ProductRegistrationsService,
    private readonly documents: ProductDocumentsService,
    private readonly safety: ProductSafetyNoticesService,
    private readonly restrictions: ExportRestrictionsService,
  ) {}

  private async audit(user: RequestUser, kind: string, recordId: string, detail: string): Promise<void> {
    await withTenantContext(user.organizationId, (tx) =>
      recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "data_exports", recordId, changedById: user.id, source: "API", changes: [{ field: kind, oldValue: null, newValue: detail }] }),
    );
  }

  private file(prefix: string, header: string[], lines: string[], rows: number, truncated: boolean): ProductExportFile {
    const stamp = new Date().toISOString().slice(0, 10);
    const note = truncated ? [csvRow([`Export stopped at ${EXPORT_ROW_LIMIT} rows; narrow the filters to see the rest.`])] : [];
    return { filename: `universe-${prefix}-${stamp}.csv`, csv: "﻿" + [csvRow(header), ...lines, ...note].join("\r\n") + "\r\n", rowCount: rows, truncated };
  }

  /** The catalogue (variants) matching the same filters as the browse screen. */
  async catalogueCsv(user: RequestUser, f: { q?: string; category?: string; sourceStandard?: string; includeArchived?: boolean }): Promise<ProductExportFile> {
    const showSim = user.inDemoOrganization === true;
    const where = {
      ...(showSim ? {} : { isSimulated: false }),
      ...(f.includeArchived ? {} : { isArchived: false }),
      ...(f.q && f.q.trim() ? { name: { contains: f.q.trim() } } : {}),
      ...(f.category ? { category: { startsWith: f.category } } : {}),
      ...(f.sourceStandard ? { sourceStandard: f.sourceStandard } : {}),
    };
    const header = ["Product ID", "Name", "Family", "Variant", "Brand", "INN", "Category", "Strength", "Dosage form", "Pack size", "GTIN", "HS code", "UNSPSC", "Standard unit", "Regulatory class", "Lifecycle", "Storage class", "Cold chain", "Shelf life (months)", "Controlled substance", "Archived", "Source standard", "Contributed by", "Created", "Updated"];
    const lines: string[] = [];
    let cursor: string | undefined;
    let truncated = false;
    for (;;) {
      const rows = await prisma.productMaster.findMany({
        where, take: PAGE, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), orderBy: { id: "asc" },
        include: { addedByOrganization: { select: { name: true } }, productFamily: { select: { name: true } } },
      });
      if (rows.length === 0) break;
      const ctx = await attributionContext(user, rows.map((r) => r.addedByOrganizationId));
      for (const r of rows) {
        if (lines.length >= EXPORT_ROW_LIMIT) { truncated = true; break; }
        const who = maskContributor(ctx, r.addedByOrganizationId, r.addedByOrganization?.name, r.attributionOverride);
        lines.push(csvRow([r.id, r.name, r.productFamily?.name, r.variantLabel, r.brand, r.inn, r.category, r.strength, r.dosageForm, r.packSize, r.gtin, r.hsCode, r.unspscCode, r.standardUnit, r.regulatoryClass, r.lifecycleStatus, r.storageClass, r.coldChain ? "Yes" : "No", r.shelfLifeMonths, r.controlledSubstance ? "Yes" : "No", r.isArchived ? "Yes" : "No", r.sourceStandard, who.name, iso(r.createdAt), iso(r.updatedAt)]));
      }
      if (truncated || rows.length < PAGE) break;
      cursor = rows[rows.length - 1].id;
    }
    await this.audit(user, "catalogue_export", "catalogue", `${lines.length} rows${truncated ? " (truncated)" : ""}; filters: ${JSON.stringify({ q: f.q ?? null, category: f.category ?? null, sourceStandard: f.sourceStandard ?? null, includeArchived: !!f.includeArchived })}`);
    return this.file("catalogue", header, lines, lines.length, truncated);
  }

  /** Every shared regulatory registration the caller can see, with the caller's own organisation's latest verification. */
  async registrationsCsv(user: RequestUser, f: { status?: string; includeArchived?: boolean }): Promise<ProductExportFile> {
    const showSim = user.inDemoOrganization === true;
    const now = new Date();
    const where = { ...(showSim ? {} : { isSimulated: false }), ...(f.includeArchived ? {} : { isArchived: false }) };
    const header = ["Registration ID", "Applies to", "Product or family", "GTIN", "Authority", "Scheme", "Reference", "Regulatory class", "Country", "Holder", "Issued", "Expires", "Days to expiry", "Status", "Verification level", "Source link", "Notes", "Contributed by", "Archived", "Your verification", "Your jurisdiction", "Verified by", "Verified on", "Next re-verification"];
    const lines: string[] = [];
    let cursor: string | undefined;
    let truncated = false;
    for (;;) {
      const rows = await prisma.productRegulatoryRegistration.findMany({
        where, take: PAGE, ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}), orderBy: { id: "asc" },
        include: { productMaster: { select: { name: true, gtin: true, isSimulated: true } }, productFamily: { select: { name: true, isSimulated: true } } },
      });
      if (rows.length === 0) break;
      const mine = await this.registrations.myVerifications(user, rows.map((r) => r.id));
      const ctx = await attributionContext(user, rows.map((r) => r.contributedByOrganizationId));
      for (const r of rows) {
        const expired = r.status === "ACTIVE" && r.expiryDate !== null && r.expiryDate < now;
        const status = expired ? "EXPIRED" : r.status;
        if (f.status && f.status !== status) continue;
        if (lines.length >= EXPORT_ROW_LIMIT) { truncated = true; break; }
        const v = mine.get(r.id);
        const days = r.expiryDate ? Math.ceil((r.expiryDate.getTime() - now.getTime()) / 86400000) : "";
        lines.push(csvRow([r.id, r.productMasterId ? "Variant" : "Family", r.productMaster?.name ?? r.productFamily?.name, r.productMaster?.gtin, r.authority, r.scheme, r.referenceNumber, r.regulatoryClass, r.countryCode, r.holderName, iso(r.issueDate), iso(r.expiryDate), days, status, r.verificationLevel, r.sourceUrl, r.notes, maskContributor(ctx, r.contributedByOrganizationId, r.contributedByOrganizationName).name, r.isArchived ? "Yes" : "No", v?.outcome, v?.jurisdiction, v?.verifiedByName, v ? v.verifiedAt.slice(0, 10) : "", v?.nextReverificationDue ? v.nextReverificationDue.slice(0, 10) : ""]));
      }
      if (truncated || rows.length < PAGE) break;
      cursor = rows[rows.length - 1].id;
    }
    await this.audit(user, "registrations_export", "registrations", `${lines.length} rows${truncated ? " (truncated)" : ""}; filters: ${JSON.stringify({ status: f.status ?? null, includeArchived: !!f.includeArchived })}`);
    return this.file("registrations", header, lines, lines.length, truncated);
  }

  /** One product's whole record in one place: identity, compliance, registrations, documents (metadata only), safety notices, export restrictions and change history. */
  async dossier(user: RequestUser, productId: string): Promise<ProductDossier> {
    const showSim = user.inDemoOrganization === true;
    const product = await this.catalogue.getOne(productId, showSim, user);
    if (!product) throw new NotFoundException("Product not found.");
    const target = productTarget(productId);
    const [registrations, documents, safetyNotices, exportRestrictions, history] = await Promise.all([
      this.registrations.list(user, target, true),
      this.documents.list(user, target, true),
      this.safety.list(user, target, true),
      this.restrictions.forProduct(user, productId),
      this.catalogue.getHistory(productId, showSim, user),
    ]);
    await this.audit(user, "dossier_export", productId, `Dossier for ${product.name}: ${registrations.length} registrations, ${documents.length} documents, ${safetyNotices.length} safety notices`);
    return { generatedAt: new Date().toISOString(), generatedFor: user.organizationName, product, registrations, documents, safetyNotices, exportRestrictions, history };
  }
}
