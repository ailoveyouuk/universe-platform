import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { Prisma } from "@prisma/client";
import { tenantScope } from "../common/tenant-scoped";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
import { CERTIFICATION_STATEMENTS } from "../common/certification-statements";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { CreateEvidenceStandardDto, UpdateEvidenceStandardDto } from "./dto/evidence-standard.dto";
import type { CreateEvidenceRecordDto, UpdateEvidenceRecordDto, VerifyEvidenceRecordDto } from "./dto/evidence-record.dto";

/**
 * Gap 3 (compliance-standards-gap-analysis.md) — the Standards & Evidence
 * scaffolding: a per-organisation configurable catalog
 * (EvidenceStandardDefinition), a generalised evidence log
 * (StakeholderEvidenceRecord), and the gating check that gives the catalog
 * actual teeth (PartnersService.update calls getGateStatus before letting
 * approvalStatus move to APPROVED — see sop-driven-quality-roadmap.md
 * "Proposed core scaffolding", section 4, "Gating").
 *
 * Deliberately NOT a separate OnboardingRequirementSet table — a
 * "requirement set" for a given stakeholder type is just the set of this
 * org's EvidenceStandardDefinition rows whose appliesToStakeholderTypes
 * includes that type and isMandatory is true; materializing that into its
 * own table would only duplicate the filter below, not add information a
 * query can't already derive.
 */
@Injectable()
export class EvidenceService {
  // --- Catalog (EvidenceStandardDefinition) ---

  async createStandard(user: RequestUser, dto: CreateEvidenceStandardDto) {
    return withTenantContext(user.organizationId, (tx) =>
      tx.evidenceStandardDefinition.create({
        data: {
          organizationId: user.organizationId,
          name: dto.name,
          description: dto.description ?? null,
          category: dto.category,
          appliesToStakeholderTypes: dto.appliesToStakeholderTypes.join(","),
          evidenceType: dto.evidenceType,
          isMandatory: dto.isMandatory ?? true,
          requiresExpiry: dto.requiresExpiry ?? false,
          reVerificationFrequencyMonths: dto.reVerificationFrequencyMonths ?? null,
          sortOrder: dto.sortOrder ?? 0,
        },
      }),
    );
  }

  /** Lists this org's catalog, optionally narrowed to standards applicable
   * to one stakeholder type (used by both the catalog-management screen
   * and the "log evidence" form on a given Partner, which only wants the
   * standards relevant to that partner's own active roles). */
  async listStandards(user: RequestUser, stakeholderType?: string) {
    const rows = await withTenantContext(user.organizationId, (tx) =>
      tx.evidenceStandardDefinition.findMany({
        where: { ...tenantScope(user.organizationId), active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
    );
    if (!stakeholderType) return rows;
    return rows.filter((r) => r.appliesToStakeholderTypes.split(",").includes(stakeholderType));
  }

  async updateStandard(user: RequestUser, id: string, dto: UpdateEvidenceStandardDto) {
    return withTenantContext(user.organizationId, async (tx) => {
      const existing = await tx.evidenceStandardDefinition.findFirst({ where: { id, ...tenantScope(user.organizationId) } });
      if (!existing) throw new NotFoundException(`Evidence standard ${id} not found`);
      return tx.evidenceStandardDefinition.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.category !== undefined ? { category: dto.category } : {}),
          ...(dto.appliesToStakeholderTypes !== undefined ? { appliesToStakeholderTypes: dto.appliesToStakeholderTypes.join(",") } : {}),
          ...(dto.evidenceType !== undefined ? { evidenceType: dto.evidenceType } : {}),
          ...(dto.isMandatory !== undefined ? { isMandatory: dto.isMandatory } : {}),
          ...(dto.requiresExpiry !== undefined ? { requiresExpiry: dto.requiresExpiry } : {}),
          ...(dto.reVerificationFrequencyMonths !== undefined ? { reVerificationFrequencyMonths: dto.reVerificationFrequencyMonths } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });
    });
  }

  // --- Evidence records (StakeholderEvidenceRecord) ---

  async createRecord(user: RequestUser, dto: CreateEvidenceRecordDto) {
    return withTenantContext(user.organizationId, (tx) =>
      tx.stakeholderEvidenceRecord.create({
        data: {
          organizationId: user.organizationId,
          partnerId: dto.partnerId,
          standardId: dto.standardId,
          referenceNumber: dto.referenceNumber ?? null,
          issuingBody: dto.issuingBody ?? null,
          issuedDate: dto.issuedDate ? new Date(dto.issuedDate) : null,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
          result: dto.result ?? null,
          documentId: dto.documentId ?? null,
          notes: dto.notes ?? null,
        },
      }),
    );
  }

  async listRecordsForPartner(user: RequestUser, partnerId: string) {
    return withTenantContext(user.organizationId, (tx) =>
      tx.stakeholderEvidenceRecord.findMany({
        where: { partnerId, ...tenantScope(user.organizationId) },
        include: { standard: true },
        orderBy: { createdAt: "desc" },
      }),
    );
  }

  async updateRecord(user: RequestUser, id: string, dto: UpdateEvidenceRecordDto) {
    return withTenantContext(user.organizationId, async (tx) => {
      const existing = await tx.stakeholderEvidenceRecord.findFirst({ where: { id, ...tenantScope(user.organizationId) } });
      if (!existing) throw new NotFoundException(`Evidence record ${id} not found`);

      const auditedFields = ["referenceNumber", "issuingBody", "issuedDate", "expiryDate", "result", "documentId", "notes"] as const;
      const normalizedDto = {
        ...dto,
        issuedDate: dto.issuedDate ? new Date(dto.issuedDate) : dto.issuedDate,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : dto.expiryDate,
      };
      const changes = diffForAudit(existing, normalizedDto, auditedFields);

      const updated = await tx.stakeholderEvidenceRecord.update({
        where: { id },
        data: {
          ...(dto.referenceNumber !== undefined ? { referenceNumber: dto.referenceNumber } : {}),
          ...(dto.issuingBody !== undefined ? { issuingBody: dto.issuingBody } : {}),
          ...(dto.issuedDate !== undefined ? { issuedDate: dto.issuedDate ? new Date(dto.issuedDate) : null } : {}),
          ...(dto.expiryDate !== undefined ? { expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null } : {}),
          ...(dto.result !== undefined ? { result: dto.result } : {}),
          ...(dto.documentId !== undefined ? { documentId: dto.documentId } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        },
      });

      await recordFieldChanges(tx, {
        organizationId: user.organizationId,
        tableName: "stakeholder_evidence_records",
        recordId: id,
        changedById: user.id,
        changes,
      });

      return updated;
    });
  }

  /** Gap 2's e-signature meaning statement, wired to a real control for
   * the first time (previously defined but unused — see
   * certification-statements.ts's own doc comment on EVIDENCE_VERIFICATION_V1). */
  async verifyRecord(user: RequestUser, id: string, dto: VerifyEvidenceRecordDto) {
    return withTenantContext(user.organizationId, async (tx) => {
      const existing = await tx.stakeholderEvidenceRecord.findFirst({ where: { id, ...tenantScope(user.organizationId) } });
      if (!existing) throw new NotFoundException(`Evidence record ${id} not found`);

      const newStatus = dto.approve ? "VERIFIED" : "REJECTED";
      const changes = diffForAudit(existing, { status: newStatus, verifiedById: user.id, verifiedAt: new Date() }, ["status", "verifiedById", "verifiedAt"]);

      const updated = await tx.stakeholderEvidenceRecord.update({
        where: { id },
        data: {
          status: newStatus,
          verifiedById: user.id,
          verifiedAt: new Date(),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        },
      });

      await recordFieldChanges(tx, {
        organizationId: user.organizationId,
        tableName: "stakeholder_evidence_records",
        recordId: id,
        changedById: user.id,
        changes,
        certificationStatement: CERTIFICATION_STATEMENTS.EVIDENCE_VERIFICATION_V1,
      });

      return updated;
    });
  }

  /** Re-verification dashboard query (sop-driven-quality-roadmap.md
   * "Gating" — a standard with reVerificationFrequencyMonths set flips a
   * verified record back to due-for-review automatically). `withinDays`
   * (default 30) controls the look-ahead window shown on the dashboard. */
  async listDueForReVerification(user: RequestUser, withinDays = 30) {
    const records = await withTenantContext(user.organizationId, (tx) =>
      tx.stakeholderEvidenceRecord.findMany({
        where: { ...tenantScope(user.organizationId), status: "VERIFIED", verifiedAt: { not: null } },
        include: { standard: true, partner: { select: { id: true, name: true } } },
      }),
    );
    const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
    return records.filter((r) => {
      const months = r.standard.reVerificationFrequencyMonths;
      if (!months || !r.verifiedAt) return false;
      const due = new Date(r.verifiedAt);
      due.setMonth(due.getMonth() + months);
      return due <= cutoff;
    });
  }

  /**
   * The gating check itself — called from PartnersService.update() before
   * allowing approvalStatus to move to APPROVED. Returns every mandatory
   * standard applicable to the partner's active roles that does NOT have
   * a current, VERIFIED evidence record (missing entirely, still PENDING/
   * REJECTED, or VERIFIED but past its own expiryDate when requiresExpiry
   * is set) — an empty array means the gate is satisfied.
   */
  async getGateStatus(
    tx: Prisma.TransactionClient,
    organizationId: string,
    partnerId: string,
  ): Promise<{ satisfied: boolean; missingStandards: { id: string; name: string }[] }> {
    const partner = await tx.partner.findFirst({
      where: { id: partnerId, organizationId },
      include: { roles: { where: { isActive: true } } },
    });
    if (!partner) return { satisfied: true, missingStandards: [] };

    const activeRoleTypes = partner.roles.map((r) => r.roleType);
    const standards = await tx.evidenceStandardDefinition.findMany({
      where: { organizationId, active: true, isMandatory: true },
    });
    const applicable = standards.filter((s) =>
      s.appliesToStakeholderTypes.split(",").some((t) => activeRoleTypes.includes(t)),
    );
    if (applicable.length === 0) return { satisfied: true, missingStandards: [] };

    const records = await tx.stakeholderEvidenceRecord.findMany({
      where: { organizationId, partnerId, standardId: { in: applicable.map((s) => s.id) } },
    });

    const now = new Date();
    const missing = applicable.filter((standard) => {
      const record = records.find((r) => r.standardId === standard.id && r.status === "VERIFIED");
      if (!record) return true;
      if (standard.requiresExpiry && record.expiryDate && record.expiryDate < now) return true;
      return false;
    });

    return {
      satisfied: missing.length === 0,
      missingStandards: missing.map((s) => ({ id: s.id, name: s.name })),
    };
  }

  /** Thrown by PartnersService when a caller tries to approve a partner
   * with unmet mandatory evidence — pulled out so the error text stays
   * consistent wherever the gate is enforced. */
  static gateFailureMessage(missing: { id: string; name: string }[]): string {
    const names = missing.map((m) => m.name).join(", ");
    return `Cannot approve this stakeholder: the following mandatory standards have no verified evidence on file — ${names}.`;
  }
}
