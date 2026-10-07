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
 *
 * Follow-up fix (added while building the frontend for this screen,
 * 2026-10-08): a Partner's own approvalStatus change does NOT write to
 * FieldChangeLog with its certification statement attached — it writes a
 * separate PartnerApprovalHistory row instead (see PartnersService.update),
 * predating this viewer and never reconciled with it. Without merging that
 * in here, an Approve-stakeholder action would silently vanish from "every
 * past value of this record," which defeats the point of an audit trail.
 * Merged in only for tableName === "partners", synthesized into the same
 * FieldChangeLogEntry shape (fieldName "approvalStatus") rather than
 * exposing two different response shapes to the frontend.
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

    const approvalRows =
      tableName === "partners"
        ? await withTenantContext(user.organizationId, (tx) =>
            tx.partnerApprovalHistory.findMany({
              where: { partnerId: recordId, ...tenantScope(user.organizationId) },
              orderBy: { actionDate: "desc" },
            }),
          )
        : [];

    const userIds = [
      ...new Set(
        [...rows.map((r) => r.changedById), ...approvalRows.map((a) => a.actionById)].filter(
          (id): id is string => id !== null,
        ),
      ),
    ];
    const users = userIds.length
      ? await withTenantContext(user.organizationId, (tx) =>
          tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, forename: true, surname: true } }),
        )
      : [];
    const nameById = new Map(users.map((u) => [u.id, `${u.forename} ${u.surname}`]));

    const fieldChangeEntries = rows.map((r) => toEntry(r, r.changedById ? nameById.get(r.changedById) ?? null : null));
    const approvalEntries: FieldChangeLogEntry[] = approvalRows.map((a) => ({
      id: a.id,
      tableName: "partners",
      recordId: a.partnerId,
      fieldName: "approvalStatus",
      oldValue: null,
      newValue: a.action,
      changedById: a.actionById,
      changedByName: a.actionById ? nameById.get(a.actionById) ?? null : null,
      changedAt: a.actionDate.toISOString(),
      reason: a.reason,
      source: "API",
      certificationStatement: a.certificationStatement,
    }));

    return [...fieldChangeEntries, ...approvalEntries].sort((a, b) => b.changedAt.localeCompare(a.changedAt));
  }
}
