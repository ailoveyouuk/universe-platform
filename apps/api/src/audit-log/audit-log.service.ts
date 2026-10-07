import { Injectable } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { FieldChangeLogEntry } from "@universe/types";
import { tenantScope } from "../common/tenant-scoped";
import type { RequestUser } from "../auth/entra-auth.guard";

type FieldChangeLogRow = {
  id: string;
  tableName: string;
  recordId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedById: string | null;
  changedAt: Date;
  reason: string | null;
  source: string;
  certificationStatement: string | null;
};

function toEntry(r: FieldChangeLogRow, changedByName: string | null): FieldChangeLogEntry {
  return {
    id: r.id,
    tableName: r.tableName,
    recordId: r.recordId,
    fieldName: r.fieldName,
    oldValue: r.oldValue,
    newValue: r.newValue,
    changedById: r.changedById,
    changedByName,
    changedAt: r.changedAt.toISOString(),
    reason: r.reason,
    source: r.source,
    certificationStatement: r.certificationStatement,
  };
}

/**
 * Gap 1 (compliance-standards-gap-analysis.md) — the read side of the
 * generic audit trail: "every past value of this one record," the exact
 * query a compliance review (or a curious user asking "who changed
 * this?") needs. Deliberately read-only — there is no update/delete
 * method anywhere in this service, matching FieldChangeLog's own doc
 * comment ("never updated or deleted by application code once written").
 */
@Injectable()
export class AuditLogService {
  async forRecord(user: RequestUser, tableName: string, recordId: string): Promise<FieldChangeLogEntry[]> {
    const rows = await withTenantContext(user.organizationId, (tx) =>
      tx.fieldChangeLog.findMany({
        where: { tableName, recordId, ...tenantScope(user.organizationId) },
        orderBy: { changedAt: "desc" },
      }),
    );

    const userIds = [...new Set(rows.map((r) => r.changedById).filter((id): id is string => id !== null))];
    const users = userIds.length
      ? await withTenantContext(user.organizationId, (tx) =>
          tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, forename: true, surname: true } }),
        )
      : [];
    const nameById = new Map(users.map((u) => [u.id, `${u.forename} ${u.surname}`]));

    return rows.map((r) => toEntry(r, r.changedById ? nameById.get(r.changedById) ?? null : null));
  }
}
