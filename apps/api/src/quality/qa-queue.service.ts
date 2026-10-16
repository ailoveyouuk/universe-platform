import { Injectable } from "@nestjs/common";
import { Prisma, withTenantContext } from "@universe/db";
import type { QaQueueCategory, QaQueueItem, QaQueuePage, QaQueueSummary } from "@universe/types";
import { tenantScope } from "../common/tenant-scoped";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";

const ROLE_LABELS: Record<string, string> = {
  CLIENT: "Clients",
  MANUFACTURER: "Manufacturers",
  SUPPLIER: "Suppliers",
  FREIGHT_FORWARDER: "Freight Forwarders",
  WAREHOUSING: "Warehousing",
  LOGISTICS: "Logistics",
};

function ageDaysSince(date: Date): number {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * QA Queue (Lewis, 2026-10-08) — everything currently waiting on a Quality
 * Assurance / Responsible Person review, pulled from the three places a
 * "needs QA sign-off" state already lives (Partner.approvalStatus,
 * StakeholderEvidenceRecord.status, ProductSourceApproval.status) rather
 * than a new workflow/queue table of its own — those three ARE the queue;
 * this just reads and normalizes them into one shape. See
 * compliance-standards-gap-analysis.md's QA/procurement segregation-of-
 * duties addendum for why this exists and qa.queue.view's gating
 * (authorization.ts's assertHasPermission).
 */
@Injectable()
export class QaQueueService {
  /** @deprecated Oldest 200 per source only — the screen uses getQueuePage. */
  async getQueue(user: RequestUser): Promise<QaQueueSummary> {
    assertHasPermission(user, "qa.queue.view");

    return withTenantContext(user.organizationId, async (tx) => {
      const [pendingPartners, pendingEvidence, pendingProducts, pendingAmendments] = await Promise.all([
        tx.partner.findMany({
          where: { ...tenantScope(user.organizationId), approvalStatus: "PENDING", isArchived: false },
          include: {
            roles: true,
            projectsAsClient: { select: { id: true, title: true }, take: 5 },
          },
          orderBy: { createdAt: "asc" },
          take: 200,
        }),
        tx.stakeholderEvidenceRecord.findMany({
          where: { ...tenantScope(user.organizationId), status: "PENDING" },
          include: {
            partner: { include: { roles: true } },
          },
          orderBy: { createdAt: "asc" },
          take: 200,
        }),
        tx.productSourceApproval.findMany({
          where: { ...tenantScope(user.organizationId), status: "PENDING", isArchived: false },
          include: { productMaster: true, manufacturer: true, supplier: true },
          orderBy: { createdAt: "asc" },
          take: 200,
        }),
        // ProductAmendment — added 2026-10-09, catalogue edit-rights +
        // ratification workflow (product-database-and-map-roadmap.md
        // Stage 0 point 1). Same tenantScope/withTenantContext pattern as
        // the three sources above: an amendment's organizationId is
        // always the org that both added AND is proposing the change to
        // this product (see ProductCatalogService.update()'s same-org
        // gate), so this naturally only ever surfaces this caller's own
        // organisation's pending amendments — exactly who's allowed to
        // ratify them.
        tx.productAmendment.findMany({
          where: { ...tenantScope(user.organizationId), status: "PENDING" },
          include: { productMaster: true },
          orderBy: { submittedAt: "asc" },
          take: 200,
        }),
      ]);

      const standardIds = [...new Set(pendingEvidence.map((r) => r.standardId))];
      const standards = standardIds.length
        ? await tx.evidenceStandardDefinition.findMany({ where: { id: { in: standardIds } } })
        : [];
      const standardNameById = new Map(standards.map((s) => [s.id, s.name]));

      const items: QaQueueItem[] = [];

      for (const p of pendingPartners) {
        const roleTypes = p.roles.map((r) => r.roleType);
        const projectLinks = p.projectsAsClient.map((proj) => ({
          label: `Project: ${proj.title}`,
          path: `/projects/detail?id=${proj.id}`,
        }));
        items.push({
          kind: "PARTNER_APPROVAL",
          id: p.id,
          title: p.name,
          detail: `Awaiting approval · ${roleTypes.map((rt) => ROLE_LABELS[rt] ?? rt).join(", ") || "no role set"}`,
          categories: roleTypes.length ? roleTypes : ["OTHER"],
          queuedAt: p.createdAt.toISOString(),
          ageDays: ageDaysSince(p.createdAt),
          links: [{ label: "Open stakeholder record", path: `/partners/detail?id=${p.id}` }, ...projectLinks],
        });
      }

      for (const r of pendingEvidence) {
        const roleTypes = r.partner.roles.map((rt) => rt.roleType);
        items.push({
          kind: "EVIDENCE_VERIFICATION",
          id: r.id,
          title: r.partner.name,
          detail: `Evidence awaiting verification · ${standardNameById.get(r.standardId) ?? "Unknown standard"}`,
          categories: roleTypes.length ? roleTypes : ["OTHER"],
          queuedAt: r.createdAt.toISOString(),
          ageDays: ageDaysSince(r.createdAt),
          links: [{ label: "Open stakeholder record", path: `/partners/detail?id=${r.partner.id}` }],
        });
      }

      for (const a of pendingProducts) {
        const partnerLinks = [
          { label: `Manufacturer: ${a.manufacturer.name}`, path: `/partners/detail?id=${a.manufacturer.id}` },
          ...(a.supplier ? [{ label: `Supplier: ${a.supplier.name}`, path: `/partners/detail?id=${a.supplier.id}` }] : []),
        ];
        items.push({
          kind: "PRODUCT_APPROVAL",
          id: a.id,
          title: a.productMaster.name,
          detail: `Product source awaiting approval · Manufacturer: ${a.manufacturer.name}${a.supplier ? ` · Supplier: ${a.supplier.name}` : ""}`,
          categories: ["PRODUCT"],
          queuedAt: a.createdAt.toISOString(),
          ageDays: ageDaysSince(a.createdAt),
          links: partnerLinks,
        });
      }

      for (const am of pendingAmendments) {
        items.push({
          kind: "PRODUCT_AMENDMENT",
          id: am.id,
          title: am.productMaster.name,
          detail: "Catalogue amendment awaiting ratification",
          categories: ["PRODUCT"],
          queuedAt: am.submittedAt.toISOString(),
          ageDays: ageDaysSince(am.submittedAt),
          links: [{ label: "Review amendment", path: `/quality/product-amendments?id=${am.id}` }],
        });
      }

      items.sort((x, y) => new Date(x.queuedAt).getTime() - new Date(y.queuedAt).getTime());

      const categoryOrder = ["MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "WAREHOUSING", "LOGISTICS", "CLIENT", "PRODUCT", "OTHER"];
      const labelFor = (key: string) => (key === "PRODUCT" ? "Products" : key === "OTHER" ? "Other" : ROLE_LABELS[key] ?? key);

      const categories: QaQueueCategory[] = categoryOrder
        .map((key) => ({
          key,
          label: labelFor(key),
          items: items.filter((i) => i.categories.includes(key)),
        }))
        .filter((c) => c.items.length > 0);

      return { categories, all: items };
    });
  }

  /**
   * One page of the QA queue, oldest first, plus category counts computed in the database
   * (2026-10-17, scale work). The old version loaded every pending record from four tables.
   * Each source is read oldest-first only as deep as the requested page needs, then merged.
   * `category` is a stakeholder role type, "PRODUCT" (product sources and catalogue amendments)
   * or "OTHER" (partners / evidence for partners with no role set).
   */
  async getQueuePage(user: RequestUser, opts: { category?: string; page?: number; pageSize?: number }): Promise<QaQueuePage> {
    assertHasPermission(user, "qa.queue.view");
    const pageSize = Math.min(Math.max(Math.floor(opts.pageSize ?? 25), 5), 100);
    const page = Math.max(Math.floor(opts.page ?? 1), 1);
    const depth = page * pageSize;
    const cat = opts.category || undefined;
    const org = user.organizationId;
    const scope = tenantScope(org);

    return withTenantContext(org, async (tx) => {
      const partnerWhere = { ...scope, approvalStatus: "PENDING", isArchived: false };
      const productWhere = { ...scope, status: "PENDING", isArchived: false };
      const amendmentWhere = { ...scope, status: "PENDING" };
      const evidenceWhere = { ...scope, status: "PENDING" };

      // --- counts (database only) ---
      const [partnerTotal, evidenceTotal, productTotal, amendmentTotal, partnerByRole, partnerNoRole, evidenceByRole] = await Promise.all([
        tx.partner.count({ where: partnerWhere }),
        tx.stakeholderEvidenceRecord.count({ where: evidenceWhere }),
        tx.productSourceApproval.count({ where: productWhere }),
        tx.productAmendment.count({ where: amendmentWhere }),
        tx.partnerRole.groupBy({ by: ["roleType"], where: { partner: partnerWhere }, _count: { _all: true } }),
        tx.partner.count({ where: { ...partnerWhere, roles: { none: {} } } }),
        tx.$queryRaw<{ k: string; n: number }[]>(Prisma.sql`
          SELECT ISNULL(r.roleType, 'OTHER') AS k, COUNT(*) AS n
          FROM stakeholder_evidence_records e LEFT JOIN partner_roles r ON r.partnerId = e.partnerId
          WHERE e.organizationId = ${org} AND e.status = 'PENDING'
          GROUP BY ISNULL(r.roleType, 'OTHER')`),
      ]);
      const counts = new Map<string, number>();
      const bump = (k: string, n: number) => counts.set(k, (counts.get(k) ?? 0) + n);
      for (const g of partnerByRole) bump(g.roleType, g._count._all);
      if (partnerNoRole) bump("OTHER", partnerNoRole);
      for (const e of evidenceByRole) bump(e.k, Number(e.n));
      bump("PRODUCT", productTotal + amendmentTotal);
      const total = partnerTotal + evidenceTotal + productTotal + amendmentTotal;

      const [oldestP, oldestE, oldestPr, oldestA] = await Promise.all([
        tx.partner.aggregate({ where: partnerWhere, _min: { createdAt: true } }),
        tx.stakeholderEvidenceRecord.aggregate({ where: evidenceWhere, _min: { createdAt: true } }),
        tx.productSourceApproval.aggregate({ where: productWhere, _min: { createdAt: true } }),
        tx.productAmendment.aggregate({ where: amendmentWhere, _min: { submittedAt: true } }),
      ]);
      const oldest = [oldestP._min.createdAt, oldestE._min.createdAt, oldestPr._min.createdAt, oldestA._min.submittedAt].filter((d): d is Date => !!d);
      const oldestAgeDays = oldest.length ? ageDaysSince(new Date(Math.min(...oldest.map((d) => d.getTime())))) : 0;

      const categoryOrder = ["MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "WAREHOUSING", "LOGISTICS", "CLIENT", "PRODUCT", "OTHER"];
      const labelFor = (key: string) => (key === "PRODUCT" ? "Products" : key === "OTHER" ? "Other" : ROLE_LABELS[key] ?? key);
      const categories: QaQueueCategory[] = categoryOrder
        .filter((k) => (counts.get(k) ?? 0) > 0)
        .map((key) => ({ key, label: labelFor(key), count: counts.get(key) ?? 0 }));
      const filteredTotal = cat ? counts.get(cat) ?? 0 : total;

      // --- rows (only as deep as this page needs) ---
      const roleFilter = !cat || cat === "PRODUCT" ? undefined : cat === "OTHER" ? { roles: { none: {} } } : { roles: { some: { roleType: cat } } };
      const wantPartners = !cat || cat !== "PRODUCT";
      const wantProducts = !cat || cat === "PRODUCT";
      const [partners, evidence, products, amendments] = await Promise.all([
        wantPartners
          ? tx.partner.findMany({
              where: { ...partnerWhere, ...(roleFilter ?? {}) },
              include: { roles: true, projectsAsClient: { select: { id: true, title: true }, take: 5 } },
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              take: depth,
            })
          : [],
        wantPartners
          ? tx.stakeholderEvidenceRecord.findMany({
              where: { ...evidenceWhere, ...(roleFilter ? { partner: roleFilter } : {}) },
              include: { partner: { include: { roles: true } } },
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              take: depth,
            })
          : [],
        wantProducts
          ? tx.productSourceApproval.findMany({
              where: productWhere,
              include: { productMaster: true, manufacturer: true, supplier: true },
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              take: depth,
            })
          : [],
        wantProducts
          ? tx.productAmendment.findMany({
              where: amendmentWhere,
              include: { productMaster: true },
              orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
              take: depth,
            })
          : [],
      ]);

      type Tagged =
        | { at: Date; kind: "p"; row: (typeof partners)[number] }
        | { at: Date; kind: "e"; row: (typeof evidence)[number] }
        | { at: Date; kind: "pr"; row: (typeof products)[number] }
        | { at: Date; kind: "a"; row: (typeof amendments)[number] };
      const tagged: Tagged[] = [
        ...partners.map((row) => ({ at: row.createdAt, kind: "p" as const, row })),
        ...evidence.map((row) => ({ at: row.createdAt, kind: "e" as const, row })),
        ...products.map((row) => ({ at: row.createdAt, kind: "pr" as const, row })),
        ...amendments.map((row) => ({ at: row.submittedAt, kind: "a" as const, row })),
      ].sort((x, y) => x.at.getTime() - y.at.getTime());
      const slice = tagged.slice((page - 1) * pageSize, page * pageSize);

      const standardIds = [...new Set(slice.filter((t) => t.kind === "e").map((t) => (t.row as (typeof evidence)[number]).standardId))];
      const standards = standardIds.length ? await tx.evidenceStandardDefinition.findMany({ where: { id: { in: standardIds } } }) : [];
      const standardNameById = new Map(standards.map((st) => [st.id, st.name]));

      const items: QaQueueItem[] = slice.map((t) => {
        if (t.kind === "p") {
          const p = t.row;
          const roleTypes = p.roles.map((r) => r.roleType);
          return {
            kind: "PARTNER_APPROVAL" as const,
            id: p.id,
            title: p.name,
            detail: `Awaiting approval · ${roleTypes.map((rt) => ROLE_LABELS[rt] ?? rt).join(", ") || "no role set"}`,
            categories: roleTypes.length ? roleTypes : ["OTHER"],
            queuedAt: p.createdAt.toISOString(),
            ageDays: ageDaysSince(p.createdAt),
            links: [
              { label: "Open stakeholder record", path: `/partners/detail?id=${p.id}` },
              ...p.projectsAsClient.map((proj) => ({ label: `Project: ${proj.title}`, path: `/projects/detail?id=${proj.id}` })),
            ],
          };
        }
        if (t.kind === "e") {
          const r = t.row;
          const roleTypes = r.partner.roles.map((rt) => rt.roleType);
          return {
            kind: "EVIDENCE_VERIFICATION" as const,
            id: r.id,
            title: r.partner.name,
            detail: `Evidence awaiting verification · ${standardNameById.get(r.standardId) ?? "Unknown standard"}`,
            categories: roleTypes.length ? roleTypes : ["OTHER"],
            queuedAt: r.createdAt.toISOString(),
            ageDays: ageDaysSince(r.createdAt),
            links: [{ label: "Open stakeholder record", path: `/partners/detail?id=${r.partner.id}` }],
          };
        }
        if (t.kind === "pr") {
          const a = t.row;
          return {
            kind: "PRODUCT_APPROVAL" as const,
            id: a.id,
            title: a.productMaster.name,
            detail: `Product source awaiting approval · Manufacturer: ${a.manufacturer.name}${a.supplier ? ` · Supplier: ${a.supplier.name}` : ""}`,
            categories: ["PRODUCT"],
            queuedAt: a.createdAt.toISOString(),
            ageDays: ageDaysSince(a.createdAt),
            links: [
              { label: `Manufacturer: ${a.manufacturer.name}`, path: `/partners/detail?id=${a.manufacturer.id}` },
              ...(a.supplier ? [{ label: `Supplier: ${a.supplier.name}`, path: `/partners/detail?id=${a.supplier.id}` }] : []),
            ],
          };
        }
        const am = t.row;
        return {
          kind: "PRODUCT_AMENDMENT" as const,
          id: am.id,
          title: am.productMaster.name,
          detail: "Catalogue amendment awaiting ratification",
          categories: ["PRODUCT"],
          queuedAt: am.submittedAt.toISOString(),
          ageDays: ageDaysSince(am.submittedAt),
          links: [{ label: "Review amendment", path: `/quality/product-amendments?id=${am.id}` }],
        };
      });

      return { total, oldestAgeDays, categories, items, filteredTotal, page, pageSize };
    });
  }
}
