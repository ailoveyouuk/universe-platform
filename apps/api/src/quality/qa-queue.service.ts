import { Injectable } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { QaQueueCategory, QaQueueItem, QaQueueSummary } from "@universe/types";
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
  async getQueue(user: RequestUser): Promise<QaQueueSummary> {
    assertHasPermission(user, "qa.queue.view");

    return withTenantContext(user.organizationId, async (tx) => {
      const [pendingPartners, pendingEvidence, pendingProducts] = await Promise.all([
        tx.partner.findMany({
          where: { ...tenantScope(user.organizationId), approvalStatus: "PENDING", isArchived: false },
          include: {
            roles: true,
            projectsAsClient: { select: { id: true, title: true }, take: 5 },
          },
          orderBy: { createdAt: "asc" },
        }),
        tx.stakeholderEvidenceRecord.findMany({
          where: { ...tenantScope(user.organizationId), status: "PENDING" },
          include: {
            partner: { include: { roles: true } },
          },
          orderBy: { createdAt: "asc" },
        }),
        tx.productSourceApproval.findMany({
          where: { ...tenantScope(user.organizationId), status: "PENDING", isArchived: false },
          include: { productMaster: true, manufacturer: true, supplier: true },
          orderBy: { createdAt: "asc" },
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
}
