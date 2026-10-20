import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createNotifications, completeActionsFor, rescheduleActionsFor } from "../notifications/notify";
import { withTenantContext } from "@universe/db";
import type {
  PagedResult,
  RiskRegisterCounts,
  CreateRiskAssessmentInput,
  RiskAssessmentListItem,
  RiskAssessmentSummary,
  UpdateRiskAssessmentInput,
} from "@universe/types";
import { tenantScope } from "../common/tenant-scoped";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { CreateRiskAssessmentDto } from "./dto/create-risk-assessment.dto";
import type { UpdateRiskAssessmentDto } from "./dto/update-risk-assessment.dto";
import type { CloseRiskAssessmentDto } from "./dto/close-risk-assessment.dto";

type RiskAssessmentWithOwner = {
  id: string;
  subjectType: string;
  subjectId: string;
  title: string;
  description: string | null;
  severity: string;
  likelihood: string;
  mitigation: string | null;
  ownerId: string | null;
  owner: { forename: string; surname: string } | null;
  status: string;
  reviewDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toSummary(r: RiskAssessmentWithOwner): RiskAssessmentSummary {
  return {
    id: r.id,
    subjectType: r.subjectType,
    subjectId: r.subjectId,
    title: r.title,
    description: r.description,
    severity: r.severity,
    likelihood: r.likelihood,
    mitigation: r.mitigation,
    ownerId: r.ownerId,
    ownerName: r.owner ? `${r.owner.forename} ${r.owner.surname}` : null,
    status: r.status,
    reviewDate: r.reviewDate ? r.reviewDate.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/**
 * Gap 4 (compliance-standards-gap-analysis.md) — a minimal, generic risk
 * register. Deliberately thin: no workflow beyond a status field and a
 * free-text mitigation note. The full Deviation/CAPA/Recall process suite
 * the first draft of sop-driven-quality-roadmap.md proposed and dropped
 * stays out of scope here too — this is core scaffolding any organisation
 * can log a risk against, not a replacement for that bigger, still-
 * undesigned feature.
 */
function riskAssignedNotification(user: RequestUser, r: { id: string; ownerId: string | null; title: string; reviewDate: Date | null }) {
  return {
    organizationId: user.organizationId,
    recipientUserId: r.ownerId as string,
    actorUserId: user.id,
    kind: "RISK_ASSIGNED",
    category: "RISK",
    title: `Review risk: ${r.title}`,
    body: `${user.forename} ${user.surname} made you the owner of this risk.`,
    link: "/risk-register",
    subjectType: "risk",
    subjectId: r.id,
    requiresAction: true,
    dueDate: r.reviewDate,
  };
}

@Injectable()
export class RiskAssessmentsService {
  async create(user: RequestUser, dto: CreateRiskAssessmentDto): Promise<RiskAssessmentSummary> {
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const created = await tx.riskAssessment.create({
        data: {
          organizationId: user.organizationId,
          subjectType: dto.subjectType,
          subjectId: dto.subjectId,
          title: dto.title,
          description: dto.description,
          severity: dto.severity,
          likelihood: dto.likelihood,
          mitigation: dto.mitigation,
          ownerId: dto.ownerId,
          reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : undefined,
          createdById: user.id,
        },
        include: { owner: { select: { forename: true, surname: true } } },
      });

      if (created.ownerId) {
        await createNotifications(tx, [riskAssignedNotification(user, created)]);
      }

      // The creation itself IS the audit record (createdById/createdAt),
      // consistent with how every other model here treats a create — see
      // FieldChangeLog's own doc comment ("one row per changed FIELD",
      // which a brand-new record has none of yet).
      return created;
    });
    return toSummary(r as unknown as RiskAssessmentWithOwner);
  }

  async listForSubject(user: RequestUser, subjectType: string, subjectId: string): Promise<RiskAssessmentSummary[]> {
    const rows = await withTenantContext(user.organizationId, (tx) =>
      tx.riskAssessment.findMany({
        where: { subjectType, subjectId, ...tenantScope(user.organizationId) },
        include: { owner: { select: { forename: true, surname: true } } },
        orderBy: { createdAt: "desc" },
      }),
    );
    return (rows as unknown as RiskAssessmentWithOwner[]).map(toSummary);
  }

  /**
   * GET /risk-assessments/all/page — the register view, paged and filtered in the database
   * (2026-10-17, scale work). Subject display names are resolved only for the rows on the page.
   * `q` matches title, description, mitigation, owner name, or the name of the stakeholder /
   * project / batch the risk is about. Sorting by severity uses the real rank (LOW < MEDIUM <
   * HIGH < CRITICAL); sorting by "subject" groups by subject type then newest first, because the
   * subject is polymorphic and has no single name column to order by. Rows with no review date
   * sort last.
   */
  async listPage(
    user: RequestUser,
    opts: { overdue?: boolean; highCritical?: boolean; q?: string; status?: string; severity?: string; subjectType?: string; sort?: string; dir?: string; page?: number; pageSize?: number },
  ): Promise<PagedResult<RiskAssessmentListItem>> {
    const pageSize = Math.min(Math.max(Math.floor(opts.pageSize ?? 25), 5), 100);
    const page = Math.max(Math.floor(opts.page ?? 1), 1);
    const skip = (page - 1) * pageSize;
    const term = opts.q?.trim();
    const dir = opts.dir === "desc" ? "desc" : "asc";
    const org = user.organizationId;

    return withTenantContext(org, async (tx) => {
      let subjectMatch: Record<string, unknown>[] = [];
      if (term) {
        const like = { contains: term };
        const [ps, prs, bs] = await Promise.all([
          tx.partner.findMany({ where: { ...tenantScope(org), name: like }, select: { id: true }, take: 200 }),
          tx.project.findMany({ where: { ...tenantScope(org), OR: [{ title: like }, { referenceNumber: like }] }, select: { id: true }, take: 200 }),
          tx.productBatch.findMany({ where: { ...tenantScope(org), batchNumber: like }, select: { id: true }, take: 200 }),
        ]);
        const ids = [...ps, ...prs, ...bs].map((x) => x.id);
        if (ids.length) subjectMatch = [{ subjectId: { in: ids } }];
      }
      const where: Record<string, unknown> = {
        ...tenantScope(org),
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.severity ? { severity: opts.severity } : {}),
        ...(opts.overdue || opts.highCritical ? { status: { in: ["OPEN", "MITIGATED"] } } : {}),
        ...(opts.overdue ? { reviewDate: { lt: new Date() } } : {}),
        ...(opts.highCritical ? { severity: { in: ["HIGH", "CRITICAL"] } } : {}),
        ...(opts.subjectType ? { subjectType: opts.subjectType } : {}),
        ...(term
          ? {
              OR: [
                { title: { contains: term } },
                { description: { contains: term } },
                { mitigation: { contains: term } },
                { owner: { OR: [{ forename: { contains: term } }, { surname: { contains: term } }] } },
                ...subjectMatch,
              ],
            }
          : {}),
      };
      const total = await tx.riskAssessment.count({ where });
      const include = { owner: { select: { forename: true, surname: true } } };
      const secondary = [{ createdAt: "desc" as const }, { id: "asc" as const }];
      const find = (w: Record<string, unknown>, orderBy: unknown, sk: number, take: number) =>
        tx.riskAssessment.findMany({ where: w, include, orderBy: orderBy as never, skip: sk, take });

      // Fetch a page that spans ordered buckets (e.g. severity ranks, dated then undated).
      const across = async (buckets: Record<string, unknown>[], orderBy: unknown) => {
        const out: Awaited<ReturnType<typeof find>> = [];
        let offset = skip;
        for (const b of buckets) {
          if (out.length >= pageSize) break;
          const w = { AND: [where, b] };
          const n = await tx.riskAssessment.count({ where: w });
          if (offset >= n) {
            offset -= n;
            continue;
          }
          out.push(...(await find(w, orderBy, offset, pageSize - out.length)));
          offset = 0;
        }
        return out;
      };

      const key = opts.sort ?? "review";
      let rows: Awaited<ReturnType<typeof find>>;
      if (key === "severity") {
        const order = dir === "asc" ? ["LOW", "MEDIUM", "HIGH", "CRITICAL"] : ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
        rows = await across(order.map((sev) => ({ severity: sev })), secondary);
      } else if (key === "review") {
        const dated = { reviewDate: { not: null } };
        const undated = { reviewDate: null };
        rows = await across([dated, undated], [{ reviewDate: dir }, ...secondary]);
      } else if (key === "title") {
        rows = await find(where, [{ title: dir }, ...secondary], skip, pageSize);
      } else if (key === "status") {
        rows = await find(where, [{ status: dir }, ...secondary], skip, pageSize);
      } else {
        rows = await find(where, [{ subjectType: dir }, ...secondary], skip, pageSize);
      }

      const idsOf = (type: string) => [...new Set(rows.filter((r) => r.subjectType === type).map((r) => r.subjectId))];
      const [partners, projects, batches] = await Promise.all([
        idsOf("PARTNER").length ? tx.partner.findMany({ where: { id: { in: idsOf("PARTNER") }, ...tenantScope(org) }, select: { id: true, name: true } }) : [],
        idsOf("PROJECT").length ? tx.project.findMany({ where: { id: { in: idsOf("PROJECT") }, ...tenantScope(org) }, select: { id: true, title: true, referenceNumber: true } }) : [],
        idsOf("PRODUCT_BATCH").length ? tx.productBatch.findMany({ where: { id: { in: idsOf("PRODUCT_BATCH") }, ...tenantScope(org) }, select: { id: true, batchNumber: true } }) : [],
      ]);
      const partnerNames = new Map(partners.map((p) => [p.id, p.name] as const));
      const projectNames = new Map(projects.map((p) => [p.id, `${p.referenceNumber} \u2014 ${p.title}`] as const));
      const batchNames = new Map(batches.map((b) => [b.id, b.batchNumber] as const));
      const subjectName = (r: { subjectType: string; subjectId: string }) =>
        r.subjectType === "PARTNER"
          ? partnerNames.get(r.subjectId) ?? "Unknown stakeholder"
          : r.subjectType === "PROJECT"
            ? projectNames.get(r.subjectId) ?? "Unknown project"
            : r.subjectType === "PRODUCT_BATCH"
              ? batchNames.get(r.subjectId) ?? "Unknown batch"
              : r.subjectId;
      return {
        items: (rows as unknown as RiskAssessmentWithOwner[]).map((r) => ({ ...toSummary(r), subjectName: subjectName(r) })),
        total,
        page,
        pageSize,
      };
    });
  }

  /** Tile counts for the register, computed in the database. "Unresolved" means OPEN or MITIGATED. */
  async counts(user: RequestUser): Promise<RiskRegisterCounts> {
    const base = tenantScope(user.organizationId);
    const unresolved = { status: { in: ["OPEN", "MITIGATED"] } };
    return withTenantContext(user.organizationId, async (tx) => {
      const [total, open, highOrCritical, overdue] = await Promise.all([
        tx.riskAssessment.count({ where: base }),
        tx.riskAssessment.count({ where: { ...base, status: "OPEN" } }),
        tx.riskAssessment.count({ where: { ...base, ...unresolved, severity: { in: ["HIGH", "CRITICAL"] } } }),
        tx.riskAssessment.count({ where: { ...base, ...unresolved, reviewDate: { lt: new Date() } } }),
      ]);
      return { total, open, highOrCritical, overdue };
    });
  }

  /**
   * GET /risk-assessments/all — the cross-cutting register view (Gap 4
   * follow-up): every risk across every subject in the organisation, not
   * scoped to one Partner/Project/batch the way listForSubject() is. The
   * subject reference is polymorphic (subjectType/subjectId, no FK — see
   * RiskAssessment's doc comment in schema.prisma) so the subject's
   * display name can't come from a Prisma `include`; it's resolved here
   * with one extra batched lookup per subject type instead of a
   * round-trip per row.
   */
  async listAll(user: RequestUser): Promise<RiskAssessmentListItem[]> {
    const { rows, partners, projects, batches } = await withTenantContext(user.organizationId, async (tx) => {
      const rows = await tx.riskAssessment.findMany({
        where: tenantScope(user.organizationId),
        include: { owner: { select: { forename: true, surname: true } } },
        orderBy: { createdAt: "desc" },
        take: 500,
      });

      const partnerIds = [...new Set(rows.filter((r) => r.subjectType === "PARTNER").map((r) => r.subjectId))];
      const projectIds = [...new Set(rows.filter((r) => r.subjectType === "PROJECT").map((r) => r.subjectId))];
      const batchIds = [...new Set(rows.filter((r) => r.subjectType === "PRODUCT_BATCH").map((r) => r.subjectId))];

      const [partners, projects, batches] = await Promise.all([
        partnerIds.length
          ? tx.partner.findMany({ where: { id: { in: partnerIds }, ...tenantScope(user.organizationId) }, select: { id: true, name: true } })
          : Promise.resolve([] as { id: string; name: string }[]),
        projectIds.length
          ? tx.project.findMany({
              where: { id: { in: projectIds }, ...tenantScope(user.organizationId) },
              select: { id: true, title: true, referenceNumber: true },
            })
          : Promise.resolve([] as { id: string; title: string; referenceNumber: string }[]),
        batchIds.length
          ? tx.productBatch.findMany({ where: { id: { in: batchIds }, ...tenantScope(user.organizationId) }, select: { id: true, batchNumber: true } })
          : Promise.resolve([] as { id: string; batchNumber: string }[]),
      ]);

      return { rows, partners, projects, batches };
    });

    const partnerNames = new Map(partners.map((p) => [p.id, p.name] as const));
    const projectNames = new Map(projects.map((p) => [p.id, `${p.referenceNumber} \u2014 ${p.title}`] as const));
    const batchNames = new Map(batches.map((b) => [b.id, b.batchNumber] as const));

    function subjectName(r: RiskAssessmentWithOwner): string {
      switch (r.subjectType) {
        case "PARTNER":
          return partnerNames.get(r.subjectId) ?? "Unknown stakeholder";
        case "PROJECT":
          return projectNames.get(r.subjectId) ?? "Unknown project";
        case "PRODUCT_BATCH":
          return batchNames.get(r.subjectId) ?? "Unknown batch";
        default:
          return r.subjectId;
      }
    }

    return (rows as unknown as RiskAssessmentWithOwner[]).map((r) => ({ ...toSummary(r), subjectName: subjectName(r) }));
  }

  async update(user: RequestUser, id: string, dto: UpdateRiskAssessmentDto): Promise<RiskAssessmentSummary> {
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const existing = await tx.riskAssessment.findFirst({ where: { id, ...tenantScope(user.organizationId) } });
      if (!existing) return null;

      const auditedFields = ["title", "description", "severity", "likelihood", "mitigation", "ownerId", "status", "reviewDate"] as const;
      const changes = diffForAudit(existing, dto, auditedFields);

      const updated = await tx.riskAssessment.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.severity !== undefined ? { severity: dto.severity } : {}),
          ...(dto.likelihood !== undefined ? { likelihood: dto.likelihood } : {}),
          ...(dto.mitigation !== undefined ? { mitigation: dto.mitigation } : {}),
          ...(dto.ownerId !== undefined ? { ownerId: dto.ownerId } : {}),
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          ...(dto.reviewDate !== undefined ? { reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : null } : {}),
        },
        include: { owner: { select: { forename: true, surname: true } } },
      });

      await recordFieldChanges(tx, {
        organizationId: user.organizationId,
        tableName: "risk_assessments",
        recordId: id,
        changedById: user.id,
        changes,
        source: "API",
      });

      // Notifications / actions: a new owner gets a "review this risk" action
      // (the previous owner's is closed); closing the risk closes them all;
      // a moved review date moves the due date.
      const ownerChanged = dto.ownerId !== undefined && dto.ownerId !== existing.ownerId;
      if (ownerChanged) {
        await completeActionsFor(tx, user.organizationId, "risk", id);
        if (updated.ownerId) await createNotifications(tx, [riskAssignedNotification(user, updated)]);
      }
      if (dto.status === "CLOSED" && existing.status !== "CLOSED") {
        await completeActionsFor(tx, user.organizationId, "risk", id);
      } else if (!ownerChanged && dto.reviewDate !== undefined) {
        await rescheduleActionsFor(tx, user.organizationId, "risk", id, updated.reviewDate);
      }

      return updated;
    });
    if (!r) throw new NotFoundException(`Risk assessment ${id} not found`);
    return toSummary(r as unknown as RiskAssessmentWithOwner);
  }

  /**
   * Dedicated "Close" action — sets status to CLOSED and always requires
   * a reason (see CloseRiskAssessmentDto), unlike the generic update()
   * above which can move status to CLOSED silently via a bare PATCH. The
   * reason is carried onto the FieldChangeLog row for the status change
   * (RecordFieldChangesOptions.reason), not stored on RiskAssessment
   * itself — this register stays deliberately thin (see this service's
   * own doc comment).
   */
  async close(user: RequestUser, id: string, dto: CloseRiskAssessmentDto): Promise<RiskAssessmentSummary> {
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const existing = await tx.riskAssessment.findFirst({ where: { id, ...tenantScope(user.organizationId) } });
      if (!existing) return null;
      if (existing.status === "CLOSED") {
        throw new BadRequestException("This risk is already closed.");
      }

      const changes = diffForAudit(existing, { status: "CLOSED" }, ["status"] as const);

      const updated = await tx.riskAssessment.update({
        where: { id },
        data: { status: "CLOSED" },
        include: { owner: { select: { forename: true, surname: true } } },
      });

      await recordFieldChanges(tx, {
        organizationId: user.organizationId,
        tableName: "risk_assessments",
        recordId: id,
        changedById: user.id,
        changes,
        reason: dto.reason,
        source: "API",
      });

      await completeActionsFor(tx, user.organizationId, "risk", id);
      if (updated.ownerId && updated.ownerId !== user.id) {
        await createNotifications(tx, [
          {
            organizationId: user.organizationId,
            recipientUserId: updated.ownerId,
            actorUserId: user.id,
            kind: "RISK_CLOSED",
            category: "RISK",
            title: `Risk closed: ${updated.title}`,
            body: `${user.forename} ${user.surname} closed it — ${dto.reason}`,
            link: "/risk-register",
            subjectType: "risk",
            subjectId: id,
          },
        ]);
      }

      return updated;
    });
    if (!r) throw new NotFoundException(`Risk assessment ${id} not found`);
    return toSummary(r as unknown as RiskAssessmentWithOwner);
  }
}
