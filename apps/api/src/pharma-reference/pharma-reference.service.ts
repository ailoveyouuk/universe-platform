import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@universe/db";
import { scopeSubForAtc } from "@universe/types";

export interface PharmaSearch { q?: string; source?: string; atc?: string; status?: string; type?: string; includeRemoved?: boolean; skip?: number; take?: number }

/**
 * Read access to the reference register of authorised medicines (EMA and MHRA). Global reference data, so no tenant context: every
 * signed-in user may search it. The register points at the official source; the official text prevails.
 */
@Injectable()
export class PharmaReferenceService {
  async search(p: PharmaSearch) {
    const q = (p.q ?? "").trim();
    const where = {
      ...(p.includeRemoved ? {} : { removedAt: null }),
      ...(p.source && ["EMA", "MHRA"].includes(p.source) ? { source: p.source } : {}),
      ...(p.status ? { status: p.status } : {}),
      ...(p.type && ["HUMAN", "VETERINARY"].includes(p.type) ? { productType: p.type } : {}),
      ...(p.atc ? { atcCode: { startsWith: p.atc.toUpperCase().slice(0, 7) } } : {}),
      ...(q ? { OR: [{ name: { contains: q } }, { activeSubstances: { contains: q } }, { inn: { contains: q } }, { holder: { contains: q } }, { sourceKey: { contains: q } }] } : {}),
    };
    const take = Math.min(Math.max(p.take ?? 50, 1), 100), skip = Math.max(p.skip ?? 0, 0);
    const [total, rows] = await Promise.all([
      prisma.pharmaReference.count({ where }),
      prisma.pharmaReference.findMany({ where, orderBy: [{ name: "asc" }], skip, take, select: {
        id: true, source: true, sourceKey: true, name: true, activeSubstances: true, inn: true, atcCode: true, holder: true, legalStatus: true, windsorCategory: true,
        productType: true, status: true, isGeneric: true, isBiosimilar: true, isOrphan: true, authorisedOn: true, sourceUrl: true, removedAt: true,
      } }),
    ]);
    return { total, items: rows.map((r) => ({ ...r, scopeSubcategory: scopeSubForAtc(r.atcCode) })) };
  }

  async get(id: string) {
    const r = await prisma.pharmaReference.findUnique({ where: { id } });
    if (!r) throw new NotFoundException("Register entry not found.");
    return { ...r, scopeSubcategory: scopeSubForAtc(r.atcCode) };
  }

  /** What is loaded and how fresh it is, for the attribution line and the "register last updated" note. */
  async summary() {
    const [counts, runs] = await Promise.all([
      prisma.pharmaReference.groupBy({ by: ["source", "status"], where: { removedAt: null }, _count: { _all: true } }),
      prisma.pharmaReferenceRun.findMany({ where: { status: "SUCCESS" }, orderBy: { finishedAt: "desc" }, take: 10, select: { source: true, finishedAt: true, fetched: true } }),
    ]);
    const last = new Map<string, { finishedAt: Date | null; fetched: number }>();
    for (const r of runs) if (!last.has(r.source)) last.set(r.source, { finishedAt: r.finishedAt, fetched: r.fetched });
    return {
      counts: counts.map((c) => ({ source: c.source, status: c.status, count: c._count._all })),
      lastSync: [...last.entries()].map(([source, v]) => ({ source, finishedAt: v.finishedAt, fetched: v.fetched })),
      attribution: "Source: European Medicines Agency (EMA) medicines data, and UK MHRA Windsor Framework category lists, published under the Open Government Licence v3.0. The official register entry prevails.",
    };
  }
}
