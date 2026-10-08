import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type {
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

      return updated;
    });
    if (!r) throw new NotFoundException(`Risk assessment ${id} not found`);
    return toSummary(r as unknown as RiskAssessmentWithOwner);
  }
}
