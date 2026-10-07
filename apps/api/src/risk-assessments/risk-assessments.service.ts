import { Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { CreateRiskAssessmentInput, RiskAssessmentSummary, UpdateRiskAssessmentInput } from "@universe/types";
import { tenantScope } from "../common/tenant-scoped";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { CreateRiskAssessmentDto } from "./dto/create-risk-assessment.dto";
import type { UpdateRiskAssessmentDto } from "./dto/update-risk-assessment.dto";

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
}
