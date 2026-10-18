import { readDeliveryCountries } from "../projects/delivery-countries";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { appliesToRoute, matchRestriction, prisma, restrictionKey, withTenantContext } from "@universe/db";
import type { ExportRestrictionSummary, ProductExportRestrictionMatch, ProjectExportCheckItem } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { CreateExportRestrictionDto, UpdateExportRestrictionDto } from "./dto/export-restriction.dto";

const chunk = <T,>(a: T[], n: number): T[][] => { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

type Row = { id: string; restrictingCountryCode: string; source: string; medicineName: string; strength: string | null; form: string | null; scope: string; restrictionDate: Date | null; status: string; removedAt: Date | null; sourceUrl: string | null; notes: string | null };
const toSummary = (r: Row): ExportRestrictionSummary => ({
  id: r.id, restrictingCountryCode: r.restrictingCountryCode, source: r.source, medicineName: r.medicineName, strength: r.strength, form: r.form, scope: r.scope,
  restrictionDate: r.restrictionDate ? r.restrictionDate.toISOString() : null, status: r.status, removedAt: r.removedAt ? r.removedAt.toISOString() : null, sourceUrl: r.sourceUrl, notes: r.notes,
});

/**
 * Export and hoarding restrictions (2026-10-18). The UK list comes from the daily DHSC/MHRA CSV; other countries' restrictions are
 * curated by platform staff with a source link. The check is advisory: it matches by generic name, strength and form and by
 * route (goods originating in the restricting country and delivered elsewhere). The legal duty stays with the licence holder.
 */
@Injectable()
export class ExportRestrictionsService {
  /** Simulated (demonstration) entries are visible only inside a demo organisation. */
  async list(includeRemoved = false, showSimulated = false): Promise<ExportRestrictionSummary[]> {
    const rows = await prisma.exportRestriction.findMany({ where: { ...(includeRemoved ? {} : { status: "ACTIVE" }), ...(showSimulated ? {} : { isSimulated: false }) }, orderBy: [{ restrictingCountryCode: "asc" }, { medicineName: "asc" }], take: 1000 });
    return rows.map(toSummary);
  }

  async create(user: RequestUser, dto: CreateExportRestrictionDto): Promise<ExportRestrictionSummary> {
    if (user.platformStaffRole === "NONE") throw new ForbiddenException("Only platform staff can add an export restriction.");
    const country = dto.restrictingCountryCode.toUpperCase();
    const known = await prisma.country.findUnique({ where: { code: country }, select: { code: true } });
    if (!known) throw new BadRequestException(`Unknown country code: ${country}`);
    const strength = dto.strength?.trim() || null;
    const form = dto.form?.trim() || null;
    const key = restrictionKey(dto.medicineName, strength, form);
    const dup = await prisma.exportRestriction.findFirst({ where: { source: "MANUAL", restrictingCountryCode: country, sourceKey: key } });
    if (dup) throw new BadRequestException("This restriction is already recorded for that country.");
    const date = dto.restrictionDate ? new Date(dto.restrictionDate) : null;
    if (date && Number.isNaN(date.getTime())) throw new BadRequestException("Invalid restriction date.");
    const row = await prisma.exportRestriction.create({
      data: { restrictingCountryCode: country, source: "MANUAL", sourceKey: key, medicineName: dto.medicineName.trim(), strength, form, scope: dto.scope ?? "BOTH", restrictionDate: date, sourceUrl: dto.sourceUrl.trim(), notes: dto.notes?.trim() || null, addedByName: `${user.forename} ${user.surname}`.trim(), isSimulated: user.inDemoOrganization === true },
    });
    return toSummary(row);
  }

  /** Staff only. Feed-managed (UK) entries can only have notes changed; manual entries can be marked REMOVED / ACTIVE. Never deleted. */
  async update(user: RequestUser, id: string, dto: UpdateExportRestrictionDto): Promise<ExportRestrictionSummary> {
    if (user.platformStaffRole === "NONE") throw new ForbiddenException("Only platform staff can change an export restriction.");
    const r = await prisma.exportRestriction.findUnique({ where: { id } });
    if (!r) throw new NotFoundException("Restriction not found.");
    if (r.source !== "MANUAL" && (dto.status !== undefined || dto.sourceUrl !== undefined)) throw new BadRequestException("Restrictions fetched from a published list are managed by the daily job; only notes can be changed.");
    const data: Record<string, unknown> = {};
    if (dto.notes !== undefined) data.notes = dto.notes.trim() || null;
    if (dto.sourceUrl !== undefined) data.sourceUrl = dto.sourceUrl.trim() || null;
    if (dto.status !== undefined && dto.status !== r.status) { data.status = dto.status; data.removedAt = dto.status === "REMOVED" ? new Date() : null; }
    return toSummary(Object.keys(data).length ? await prisma.exportRestriction.update({ where: { id }, data }) : r);
  }

  async forProduct(user: RequestUser, productId: string): Promise<ProductExportRestrictionMatch[]> {
    const p = await prisma.productMaster.findUnique({ where: { id: productId }, select: { name: true, inn: true, strength: true, dosageForm: true, isSimulated: true } });
    if (!p || (p.isSimulated && user.inDemoOrganization !== true)) throw new NotFoundException("Product not found.");
    const active = await prisma.exportRestriction.findMany({ where: { status: "ACTIVE", ...(user.inDemoOrganization === true ? {} : { isSimulated: false }) } });
    const out: ProductExportRestrictionMatch[] = [];
    for (const r of active) {
      const m = matchRestriction(p, r);
      if (m) out.push({ restriction: toSummary(r), certainty: m.certainty, detail: m.detail });
    }
    return out;
  }

  /**
   * Checks every product line of a project against the active restrictions by route. Origin is the supplier's country (the
   * stock's likely location), else the manufacturer's, else the line's country of manufacture; destination is the project's
   * delivery country. Restricted when origin is the restricting country and destination is elsewhere.
   */
  async checkProject(user: RequestUser, projectId: string): Promise<ProjectExportCheckItem[]> {
    const data = await withTenantContext(user.organizationId, async (tx) => {
      const project = await tx.project.findFirst({ where: { id: projectId }, select: { deliveryCountryCode: true, deliveryCountryCodes: true } });
      if (!project) return null;
      const lines = await tx.projectLine.findMany({
        where: { projectId, archivedAt: null, productMasterId: { not: null } },
        select: { id: true, clientProductDescription: true, productMasterId: true, supplierId: true, manufacturerId: true, countryOfManufactureCode: true },
      });
      const partnerIds = [...new Set(lines.flatMap((l) => [l.supplierId, l.manufacturerId]).filter((v): v is string => !!v))];
      const partners = new Map<string, string | null>();
      for (const ids of chunk(partnerIds, 500)) for (const p of await tx.partner.findMany({ where: { id: { in: ids } }, select: { id: true, countryCode: true } })) partners.set(p.id, p.countryCode);
      return { project, lines, partners };
    });
    if (!data) throw new NotFoundException("Project not found.");
    const active = await prisma.exportRestriction.findMany({ where: { status: "ACTIVE", ...(user.inDemoOrganization === true ? {} : { isSimulated: false }) } });
    if (active.length === 0 || data.lines.length === 0) return [];
    const productIds = [...new Set(data.lines.map((l) => l.productMasterId as string))];
    const products = new Map<string, { name: string; inn: string | null; strength: string | null; dosageForm: string | null }>();
    for (const ids of chunk(productIds, 500)) for (const p of await prisma.productMaster.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, inn: true, strength: true, dosageForm: true } })) products.set(p.id, p);
    const dests: (string | null)[] = readDeliveryCountries(data.project);
    if (dests.length === 0) dests.push(null);
    const out: ProjectExportCheckItem[] = [];
    for (const l of data.lines) {
      const supplierCountry = l.supplierId ? data.partners.get(l.supplierId) ?? null : null;
      const manufacturerCountry = l.manufacturerId ? data.partners.get(l.manufacturerId) ?? null : null;
      const origin = supplierCountry ? { code: supplierCountry, basis: "supplier's country" } : manufacturerCountry ? { code: manufacturerCountry, basis: "manufacturer's country" } : l.countryOfManufactureCode ? { code: l.countryOfManufactureCode, basis: "country of manufacture" } : null;
      const p = products.get(l.productMasterId as string);
      if (!origin || !p) continue;
      for (const dest of dests) for (const r of active) {
        const route = appliesToRoute(r.restrictingCountryCode, origin.code, dest);
        if (route === "NO") continue;
        const m = matchRestriction(p, r);
        if (!m) continue;
        out.push({ lineId: l.id, lineDescription: l.clientProductDescription, productMasterId: l.productMasterId as string, productName: p.name, restriction: toSummary(r), certainty: m.certainty, detail: m.detail, route, originCountryCode: origin.code.toUpperCase(), originBasis: origin.basis, destinationCountryCode: dest ? dest.toUpperCase() : null });
      }
    }
    return out;
  }
}
