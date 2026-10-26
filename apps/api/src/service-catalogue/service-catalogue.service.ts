import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@universe/db";
import { getServicePrices } from "@universe/insights-db";
import { SERVICE_CATALOGUE, SERVICE_CATEGORIES, canUseApp, type ServiceCostRange } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";

export interface CatalogueEntryInput { code?: string; category?: string; name?: string; basis?: string; unit?: string; description?: string; active?: boolean }

/** Why an entry cannot be saved as given, or null. The basis must be one the category is usually quoted on, so suppliers compare like with like. */
export function catalogueEntryProblem(e: Required<Omit<CatalogueEntryInput, "active">>): string | null {
  if (!/^SVC-[A-Z0-9]+(-[A-Z0-9]+)*$/.test(e.code) || e.code.length > 40) return "The code must look like SVC-ABC-NAME (capital letters, digits and hyphens, up to 40 characters).";
  const c = SERVICE_CATEGORIES.find((x) => x.code === e.category);
  if (!c) return "Choose a kind of service from the list.";
  if (!c.bases.includes(e.basis as never)) return `That kind of service is not usually priced that way. Use one of: ${c.bases.join(", ")}.`;
  if (!e.name.trim() || e.name.length > 200) return "Give the service a name of up to 200 characters.";
  if (!e.unit.trim() || e.unit.length > 80) return "Say what one unit is (a visit, a month), up to 80 characters.";
  if (!e.description.trim() || e.description.length > 1000) return "Describe the service in up to 1,000 characters.";
  return null;
}

/**
 * Standard services catalogue (2026-10-26). Shared reference data held in the database so platform staff can edit it without a release.
 * The list in @universe/types seeds the table: any code in it that the table lacks is inserted on first read after a start (idempotent,
 * never overwrites an edit). Entries are switched off, never deleted.
 */
@Injectable()
export class ServiceCatalogueService {
  private seeded: Promise<void> | null = null;

  private ensureSeeded() {
    this.seeded ??= (async () => {
      const have = new Set((await prisma.serviceCatalogueEntry.findMany({ select: { code: true } })).map((r) => r.code));
      for (const i of SERVICE_CATALOGUE) if (!have.has(i.code)) await prisma.serviceCatalogueEntry.create({ data: { code: i.code, category: i.category, name: i.name, basis: i.basis, unit: i.unit, description: i.description } });
    })().catch((e) => { this.seeded = null; throw e; });
    return this.seeded;
  }

  private static readonly select = { code: true, category: true, name: true, basis: true, unit: true, description: true, active: true } as const;

  /** What pickers offer: active entries only. */
  async list() {
    await this.ensureSeeded();
    return prisma.serviceCatalogueEntry.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }], select: ServiceCatalogueService.select });
  }

  /** Staff editor: every entry including switched-off ones. */
  async listAll(user: RequestUser) {
    this.assertStaff(user);
    await this.ensureSeeded();
    return prisma.serviceCatalogueEntry.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }], select: ServiceCatalogueService.select });
  }

  /** Codes that exist (active or not) for server-side line validation: an existing line keeps working after its service is switched off. */
  async lookup(codes: (string | null | undefined)[]): Promise<(code: string) => { category: string } | undefined> {
    const want = [...new Set(codes.filter((c): c is string => !!c))];
    if (want.length === 0) return () => undefined;
    await this.ensureSeeded();
    const rows = await prisma.serviceCatalogueEntry.findMany({ where: { code: { in: want } }, select: { code: true, category: true } });
    const m = new Map(rows.map((r) => [r.code, r]));
    return (code) => m.get(code);
  }

  async create(user: RequestUser, dto: CatalogueEntryInput) {
    this.assertStaff(user);
    await this.ensureSeeded();
    const e = { code: (dto.code ?? "").trim().toUpperCase(), category: dto.category ?? "", name: (dto.name ?? "").trim(), basis: dto.basis ?? "", unit: (dto.unit ?? "").trim(), description: (dto.description ?? "").trim() };
    const problem = catalogueEntryProblem(e);
    if (problem) throw new BadRequestException(problem);
    if (await prisma.serviceCatalogueEntry.findUnique({ where: { code: e.code } })) throw new BadRequestException("That code is already used. Codes are never reused.");
    return prisma.serviceCatalogueEntry.create({ data: { ...e, updatedById: user.id }, select: ServiceCatalogueService.select });
  }

  /** The code and the kind of service are fixed once created, because lines already carry them. */
  async update(user: RequestUser, code: string, dto: CatalogueEntryInput) {
    this.assertStaff(user);
    await this.ensureSeeded();
    const cur = await prisma.serviceCatalogueEntry.findUnique({ where: { code } });
    if (!cur) throw new NotFoundException("That service is not in the catalogue.");
    if (dto.category !== undefined && dto.category !== cur.category) throw new BadRequestException("The kind of service cannot be changed after creation. Switch this one off and add a new one.");
    const next = { code, category: cur.category, name: (dto.name ?? cur.name).trim(), basis: dto.basis ?? cur.basis, unit: (dto.unit ?? cur.unit).trim(), description: (dto.description ?? cur.description).trim() };
    const problem = catalogueEntryProblem(next);
    if (problem) throw new BadRequestException(problem);
    return prisma.serviceCatalogueEntry.update({ where: { code }, data: { name: next.name, basis: next.basis, unit: next.unit, description: next.description, ...(dto.active !== undefined ? { active: !!dto.active } : {}), updatedById: user.id }, select: ServiceCatalogueService.select });
  }

  /**
   * Anonymised cost range beside a standard service (2026-10-26). Cost price only (before any margin), for the service's kind of service in
   * its usual pricing basis, taken from the Insights aggregates, which already hold back anything with fewer than five contributing
   * organisations. Shown to people who have been given Insights; everyone else gets an empty range. Simulated rows count only for demo users.
   */
  async costRange(user: RequestUser, code: string): Promise<ServiceCostRange> {
    const entry = await prisma.serviceCatalogueEntry.findUnique({ where: { code }, select: { category: true, basis: true } });
    if (!entry) throw new NotFoundException("That service is not in the catalogue.");
    if (user.platformStaffRole === "NONE" && !canUseApp(user.apps, "insights")) return { basis: entry.basis, ranges: [] };
    const rows = await getServicePrices(false, user.inDemoOrganization === true);
    return { basis: entry.basis, ranges: rows.filter((r) => r.serviceCategory === entry.category && r.pricingBasis === entry.basis).map((r) => ({ currency: r.currency, minPrice: r.minPrice, maxPrice: r.maxPrice, avgPrice: r.avgPrice, sourceCount: r.sourceCount })) };
  }

  private assertStaff(user: RequestUser) {
    if (user.platformStaffRole === "NONE") throw new ForbiddenException("Only platform staff can edit the services catalogue.");
  }
}
