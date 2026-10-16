import { Injectable } from "@nestjs/common";
import type { SearchResponse, SearchResult } from "@universe/types";
import { prisma, withTenantContext } from "@universe/db";
import type { RequestUser } from "../auth/entra-auth.guard";
import { tenantScope } from "../common/tenant-scoped";

const PER_GROUP = 5;

/**
 * Global search (added 2026-10-17): one box that finds projects,
 * stakeholders, contacts, batches, risks and catalogue products. Everything
 * except the shared product catalogue runs inside withTenantContext, so a
 * user can only ever find their own organisation's records (RLS + app
 * scoping, same as the list endpoints). It returns names and references only
 * — the same facts the list screens already show every member.
 */
@Injectable()
export class SearchService {
  async search(user: RequestUser, rawQuery: string): Promise<SearchResponse> {
    const q = (rawQuery ?? "").trim().slice(0, 80);
    if (q.length < 2) return { query: q, results: [] };
    const org = tenantScope(user.organizationId);

    const [projects, partners, contacts, batches, risks] = await withTenantContext(user.organizationId, (tx) =>
      Promise.all([
        tx.project.findMany({
          where: { ...org, OR: [{ referenceNumber: { contains: q } }, { title: { contains: q } }] },
          select: { id: true, referenceNumber: true, title: true, status: true },
          orderBy: { updatedAt: "desc" },
          take: PER_GROUP,
        }),
        tx.partner.findMany({
          where: { ...org, OR: [{ name: { contains: q } }, { normalizedName: { contains: q.toLowerCase() } }] },
          select: { id: true, name: true, countryCode: true, approvalStatus: true },
          orderBy: { name: "asc" },
          take: PER_GROUP,
        }),
        tx.contact.findMany({
          where: { ...org, OR: [{ name: { contains: q } }, { email: { contains: q } }] },
          select: { id: true, name: true, email: true, partnerId: true, partner: { select: { name: true } } },
          orderBy: { name: "asc" },
          take: PER_GROUP,
        }),
        tx.productBatch.findMany({
          where: { ...org, OR: [{ batchNumber: { contains: q } }, { productMaster: { name: { contains: q } } }] },
          select: { id: true, batchNumber: true, status: true, productMaster: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: PER_GROUP,
        }),
        tx.riskAssessment.findMany({
          where: { ...org, title: { contains: q } },
          select: { id: true, title: true, status: true, severity: true },
          orderBy: { createdAt: "desc" },
          take: PER_GROUP,
        }),
      ]),
    );

    // The shared catalogue has no tenant column, so it is read directly.
    const products = await prisma.productMaster.findMany({
      where: { OR: [{ name: { contains: q } }, { hsCode: { contains: q } }, { gtin: { contains: q } }] },
      select: { id: true, name: true, category: true },
      orderBy: { name: "asc" },
      take: PER_GROUP,
    });

    const pretty = (s: string) => s.replace(/_/g, " ").toLowerCase();
    const results: SearchResult[] = [
      ...projects.map((p) => ({ type: "project" as const, id: p.id, title: `${p.referenceNumber} · ${p.title}`, subtitle: pretty(p.status), link: `/projects/detail?id=${p.id}`, app: "project-management" as const })),
      ...partners.map((p) => ({ type: "stakeholder" as const, id: p.id, title: p.name, subtitle: [p.countryCode, pretty(p.approvalStatus)].filter(Boolean).join(" · "), link: `/partners/detail?id=${p.id}`, app: "project-management" as const })),
      ...contacts.map((c) => ({ type: "contact" as const, id: c.id, title: c.name, subtitle: [c.partner?.name, c.email].filter(Boolean).join(" · "), link: `/partners/detail?id=${c.partnerId}`, app: "project-management" as const })),
      ...batches.map((b) => ({ type: "batch" as const, id: b.id, title: `Batch ${b.batchNumber}`, subtitle: [b.productMaster?.name, pretty(b.status)].filter(Boolean).join(" · "), link: `/batches/detail?id=${b.id}`, app: "project-management" as const })),
      ...risks.map((r) => ({ type: "risk" as const, id: r.id, title: r.title, subtitle: [r.severity && pretty(String(r.severity)), pretty(r.status)].filter(Boolean).join(" · "), link: "/risk-register", app: "project-management" as const })),
      ...products.map((p) => ({ type: "product" as const, id: p.id, title: p.name, subtitle: p.category, link: `/?q=${encodeURIComponent(p.name)}`, app: "product-database" as const })),
    ];
    return { query: q, results };
  }
}
