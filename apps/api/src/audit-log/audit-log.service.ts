import { Injectable } from "@nestjs/common";
import { withPlatformStaffContext, withTenantContext } from "@universe/db";
import type { FieldChangeFeedEntry, FieldChangeFeedPage, FieldChangeLogEntry } from "@universe/types";
import { BadRequestException } from "@nestjs/common";
import { assertCanManageOrg } from "../common/authorization";
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
    // Platform staff (Admin app) may read the history of any tenant's record,
    // so they run cross-tenant with no organisation filter; everyone else is
    // confined to their own organisation exactly as before.
    const isPlatform = user.platformStaffRole !== "NONE";
    const run = <T,>(fn: (tx: any) => Promise<T>): Promise<T> =>
      isPlatform ? withPlatformStaffContext(fn) : withTenantContext(user.organizationId, fn);
    const scope = isPlatform ? {} : tenantScope(user.organizationId);

    const rows: FieldChangeLogRow[] = await run((tx) =>
      tx.fieldChangeLog.findMany({
        where: { tableName, recordId, ...scope },
        orderBy: { changedAt: "desc" },
      }),
    );

    const approvalRows: any[] =
      tableName === "partners"
        ? await run((tx) =>
            tx.partnerApprovalHistory.findMany({
              where: { partnerId: recordId, ...scope },
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
    const users: { id: string; forename: string; surname: string }[] = userIds.length
      ? await run((tx) =>
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

  /** Global activity feed — see AuditLogController.feed. Records are labelled
   * best-effort for the tables the Admin app cares about; anything else falls
   * back to table + short id. */
  async feed(
    user: RequestUser,
    q: { organizationId?: string; tableName?: string; changedById?: string; before?: string; limit?: number },
  ): Promise<FieldChangeFeedPage> {
    const isPlatform = user.platformStaffRole !== "NONE";
    const orgId = isPlatform ? q.organizationId : user.organizationId;
    if (!isPlatform) assertCanManageOrg(user, user.organizationId, "org.users.manage");
    const limit = Math.min(Math.max(q.limit ?? 50, 1), 100);
    let before: Date | undefined;
    if (q.before) {
      before = new Date(q.before);
      if (Number.isNaN(before.getTime())) throw new BadRequestException("before must be an ISO date");
    }
    const run = <T,>(fn: (tx: any) => Promise<T>): Promise<T> =>
      isPlatform ? withPlatformStaffContext(fn) : withTenantContext(user.organizationId, fn);

    const where: Record<string, unknown> = {};
    if (orgId) where.organizationId = orgId;
    if (q.tableName) where.tableName = q.tableName;
    if (q.changedById) where.changedById = q.changedById;
    if (before) where.changedAt = { lt: before };

    const rows: FieldChangeLogRow[] & { organizationId: string }[] = await run((tx) =>
      tx.fieldChangeLog.findMany({ where, orderBy: { changedAt: "desc" }, take: limit + 1 }),
    );
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    const ids = (table: string) => [...new Set(page.filter((r) => r.tableName === table).map((r) => r.recordId))];
    const orgIds = [...new Set(page.map((r: any) => r.organizationId as string))];
    const actorIds = [...new Set(page.map((r) => r.changedById).filter((x): x is string => !!x))];
    const userIds = [...new Set([...ids("users"), ...actorIds])];

    const [orgs, users, roles, partners, projects] = await run(async (tx) => [
      await tx.organization.findMany({ where: { id: { in: [...new Set([...orgIds, ...ids("organizations")])] } }, select: { id: true, name: true } }),
      userIds.length ? await tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, forename: true, surname: true } }) : [],
      ids("roles").length ? await tx.role.findMany({ where: { id: { in: ids("roles") } }, select: { id: true, name: true } }) : [],
      ids("partners").length ? await tx.partner.findMany({ where: { id: { in: ids("partners") } }, select: { id: true, name: true } }) : [],
      ids("projects").length ? await tx.project.findMany({ where: { id: { in: ids("projects") } }, select: { id: true, referenceNumber: true } }) : [],
    ]);
    const orgName = new Map<string, string>(orgs.map((o: any) => [o.id, o.name]));
    const userName = new Map<string, string>(users.map((u: any) => [u.id, `${u.forename} ${u.surname}`]));
    const roleName = new Map<string, string>(roles.map((r: any) => [r.id, r.name]));
    const partnerName = new Map<string, string>(partners.map((p: any) => [p.id, p.name]));
    const projectRef = new Map<string, string>(projects.map((p: any) => [p.id, p.referenceNumber]));

    const labelFor = (table: string, id: string): string => {
      const found =
        table === "users" ? userName.get(id) : table === "organizations" ? orgName.get(id) : table === "roles" ? roleName.get(id) : table === "partners" ? partnerName.get(id) : table === "projects" ? projectRef.get(id) : undefined;
      return found ?? `${table} ${id.slice(0, 8)}`;
    };

    const entries: FieldChangeFeedEntry[] = page.map((r: any) => ({
      ...toEntry(r, r.changedById ? userName.get(r.changedById) ?? null : null),
      organizationId: r.organizationId,
      organizationName: orgName.get(r.organizationId) ?? null,
      recordLabel: labelFor(r.tableName, r.recordId),
    }));
    return { entries, nextBefore: hasMore ? page[page.length - 1].changedAt.toISOString() : null };
  }
}
