import { Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { ControlledDocumentSummary } from "@universe/types";
import { tenantScope } from "../common/tenant-scoped";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
import type { RequestUser } from "../auth/entra-auth.guard";
import type { CreateControlledDocumentDto, UpdateControlledDocumentDto } from "./dto/controlled-document.dto";

type ControlledDocumentRow = {
  id: string;
  title: string;
  category: string;
  version: string;
  effectiveDate: Date | null;
  supersedesId: string | null;
  approvedById: string | null;
  approvedBy: { forename: string; surname: string } | null;
  approvedAt: Date | null;
  documentId: string | null;
  supersededBy: { id: string } | null;
  createdAt: Date;
};

/** isCurrent is derived, not stored — a document is current exactly when
 * nothing else's supersedesId points at it. See ControlledDocument's doc
 * comment in schema.prisma for why this is a one-directional self-relation
 * rather than a separate status column that could drift out of sync. */
function toSummary(row: ControlledDocumentRow): ControlledDocumentSummary {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    version: row.version,
    effectiveDate: row.effectiveDate ? row.effectiveDate.toISOString() : null,
    supersedesId: row.supersedesId,
    supersededById: row.supersededBy ? row.supersededBy.id : null,
    approvedById: row.approvedById,
    approvedByName: row.approvedBy ? `${row.approvedBy.forename} ${row.approvedBy.surname}` : null,
    approvedAt: row.approvedAt ? row.approvedAt.toISOString() : null,
    documentId: row.documentId,
    isCurrent: !row.supersededBy,
    createdAt: row.createdAt.toISOString(),
  };
}

const INCLUDE = {
  approvedBy: { select: { forename: true, surname: true } },
  supersededBy: { select: { id: true } },
} as const;

/**
 * Gap 7 (compliance-standards-gap-analysis.md) — a minimal controlled-
 * document register for an organisation's own SOPs/policies, closing the
 * only entirely-untouched item from this whole build. Deliberately thin:
 * create records the next version (optionally linked to the one it
 * supersedes), update records approval/effective-date/file changes — no
 * workflow beyond that.
 */
@Injectable()
export class ControlledDocumentsService {
  async create(user: RequestUser, dto: CreateControlledDocumentDto): Promise<ControlledDocumentSummary> {
    const row = await withTenantContext(user.organizationId, (tx) =>
      tx.controlledDocument.create({
        data: {
          organizationId: user.organizationId,
          title: dto.title,
          category: dto.category,
          version: dto.version,
          effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : undefined,
          supersedesId: dto.supersedesId,
          documentId: dto.documentId,
          createdById: user.id,
        },
        include: INCLUDE,
      }),
    );
    return toSummary(row as unknown as ControlledDocumentRow);
  }

  async list(user: RequestUser, category?: string): Promise<ControlledDocumentSummary[]> {
    const rows = await withTenantContext(user.organizationId, (tx) =>
      tx.controlledDocument.findMany({
        where: { ...tenantScope(user.organizationId), ...(category ? { category } : {}) },
        include: INCLUDE,
        orderBy: { createdAt: "desc" },
      }),
    );
    return (rows as unknown as ControlledDocumentRow[]).map(toSummary);
  }

  async update(user: RequestUser, id: string, dto: UpdateControlledDocumentDto): Promise<ControlledDocumentSummary> {
    const row = await withTenantContext(user.organizationId, async (tx) => {
      const existing = await tx.controlledDocument.findFirst({ where: { id, ...tenantScope(user.organizationId) } });
      if (!existing) return null;

      const auditedFields = ["title", "effectiveDate", "approvedById", "documentId"] as const;
      const changes = diffForAudit(existing, dto, auditedFields);

      const updated = await tx.controlledDocument.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.effectiveDate !== undefined ? { effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null } : {}),
          ...(dto.approvedById !== undefined ? { approvedById: dto.approvedById, approvedAt: dto.approvedById ? new Date() : null } : {}),
          ...(dto.documentId !== undefined ? { documentId: dto.documentId } : {}),
        },
        include: INCLUDE,
      });

      await recordFieldChanges(tx, {
        organizationId: user.organizationId,
        tableName: "controlled_documents",
        recordId: id,
        changedById: user.id,
        changes,
        source: "API",
      });

      return updated;
    });
    if (!row) throw new NotFoundException(`Controlled document ${id} not found`);
    return toSummary(row as unknown as ControlledDocumentRow);
  }
}
