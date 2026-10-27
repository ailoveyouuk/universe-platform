import { Injectable } from "@nestjs/common";
import { canUseApp, type SearchResponse, type SearchResult } from "@universe/types";
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

    // Only look in the apps this person has been given (Admin > Users > Apps), so a record title never reaches someone who cannot open it.
    const pm = canUseApp(user.apps, "project-management");
    const pd = canUseApp(user.apps, "product-database");
    const ti = canUseApp(user.apps, "tender-issuance") && (user.platformStaffRole !== "NONE" || user.permissions.includes("tenders.issue"));
    const crm = canUseApp(user.apps, "crm") && (user.platformStaffRole !== "NONE" || user.permissions.includes("crm.view"));
    const none = <T,>(): Promise<T[]> => Promise.resolve([]);

    const [projects, partners, contacts, batches, risks, tenders, relationships, opportunities] = await withTenantContext(user.organizationId, (tx) =>
      Promise.all([
        !pm ? none<any>() : tx.project.findMany({
          where: { ...org, OR: [{ referenceNumber: { contains: q } }, { title: { contains: q } }] },
          select: { id: true, referenceNumber: true, title: true, status: true },
          orderBy: { updatedAt: "desc" },
          take: PER_GROUP,
        }),
        !pm ? none<any>() : tx.partner.findMany({
          where: { ...org, OR: [{ name: { contains: q } }, { normalizedName: { contains: q.toLowerCase() } }] },
          select: { id: true, name: true, countryCode: true, approvalStatus: true },
          orderBy: { name: "asc" },
          take: PER_GROUP,
        }),
        !pm ? none<any>() : tx.contact.findMany({
          where: { ...org, OR: [{ name: { contains: q } }, { email: { contains: q } }] },
          select: { id: true, name: true, email: true, partnerId: true, partner: { select: { name: true } } },
          orderBy: { name: "asc" },
          take: PER_GROUP,
        }),
        !pm ? none<any>() : tx.productBatch.findMany({
          where: { ...org, OR: [{ batchNumber: { contains: q } }, { productMaster: { name: { contains: q } } }] },
          select: { id: true, batchNumber: true, status: true, productMaster: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: PER_GROUP,
        }),
        !pm ? none<any>() : tx.riskAssessment.findMany({
          where: { ...org, title: { contains: q } },
          select: { id: true, title: true, status: true, severity: true },
          orderBy: { createdAt: "desc" },
          take: PER_GROUP,
        }),
        !ti ? none<any>() : tx.tender.findMany({
          where: { ...org, archivedAt: null, OR: [{ referenceNumber: { contains: q } }, { title: { contains: q } }] },
          select: { id: true, referenceNumber: true, title: true, status: true },
          orderBy: { updatedAt: "desc" },
          take: PER_GROUP,
        }),
        !crm ? none<any>() : tx.crmRelationship.findMany({
          where: { ...org, archivedAt: null, partner: { name: { contains: q } } },
          select: { id: true, status: true, tier: true, partner: { select: { name: true } } },
          orderBy: { updatedAt: "desc" },
          take: PER_GROUP,
        }),
        !crm ? none<any>() : tx.crmOpportunity.findMany({
          where: { ...org, archivedAt: null, OR: [{ title: { contains: q } }, { relationship: { partner: { name: { contains: q } } } }] },
          select: { id: true, title: true, stage: true, relationshipId: true, relationship: { select: { partner: { select: { name: true } } } } },
          orderBy: { updatedAt: "desc" },
          take: PER_GROUP,
        }),
      ]),
    );

    // The shared catalogue has no tenant column, so it is read directly.
    const products = !pd ? [] : await prisma.productMaster.findMany({
      where: { OR: [{ name: { contains: q } }, { hsCode: { contains: q } }, { gtin: { contains: q } }], ...(user.inDemoOrganization ? {} : { isSimulated: false }) },
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
      ...tenders.map((t: any) => ({ type: "tender" as const, id: t.id, title: `${t.referenceNumber} · ${t.title}`, subtitle: pretty(t.status), link: t.status === "DRAFT" ? `/tenders/builder?id=${t.id}` : `/tenders/manage?id=${t.id}`, app: "tender-issuance" as const })),
      ...products.map((p) => ({ type: "product" as const, id: p.id, title: p.name, subtitle: p.category, link: `/products/detail?id=${p.id}`, app: "product-database" as const })),
      ...relationships.map((r: any) => ({ type: "relationship" as const, id: r.id, title: r.partner?.name ?? "Relationship", subtitle: [pretty(r.tier), pretty(r.status)].join(" · "), link: `/relationships?id=${r.id}`, app: "crm" as const })),
      ...opportunities.map((o: any) => ({ type: "opportunity" as const, id: o.id, title: o.title, subtitle: [o.relationship?.partner?.name, pretty(o.stage)].filter(Boolean).join(" · "), link: `/relationships?id=${o.relationshipId}`, app: "crm" as const })),
    ];
    return { query: q, results };
  }
}
