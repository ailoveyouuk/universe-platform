import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import type { DataExportRequestSummary, ProductExportFile } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { recordFieldChanges } from "../common/audit-log";
import { createNotifications } from "../notifications/notify";
import type { CreateDataExportRequestDto, DecideDataExportRequestDto } from "./dto/data-export-request.dto";
import { ProductExportsService, isGlobalAdmin } from "./product-exports.service";

const APPROVAL_DAYS = 7;
const MAX_PENDING_PER_ORG = 5;

type Row = {
  id: string; scope: string; filters: string | null; reason: string; status: string; organizationId: string; requestedById: string; createdAt: Date;
  decidedAt: Date | null; decisionNote: string | null; approvedUntil: Date | null; downloadedAt: Date | null; rowCount: number | null;
  organization?: { name: string } | null; requestedBy?: { forename: string; surname: string } | null; decidedBy?: { forename: string; surname: string } | null;
};
const name = (u?: { forename: string; surname: string } | null) => (u ? `${u.forename} ${u.surname}`.trim() : null);
const parse = (s: string | null): Record<string, string | boolean | null> => { try { return s ? JSON.parse(s) : {}; } catch { return {}; } };

/**
 * Requests to export the shared catalogue (2026-10-18). The pooled catalogue is a platform asset, so only global admins export it
 * directly; any other organisation asks, giving a reason, and a global admin approves or rejects. An approval is good for one
 * download within seven days and the download is audited. Organisations can always export what they themselves contributed.
 */
@Injectable()
export class ExportRequestsService {
  constructor(private readonly exportsService: ProductExportsService) {}

  private toSummary(r: Row, viewerId: string): DataExportRequestSummary {
    const expired = r.status === "APPROVED" && r.approvedUntil !== null && r.approvedUntil < new Date();
    const status = expired ? "EXPIRED" : r.status;
    return {
      id: r.id, scope: r.scope, filters: parse(r.filters), reason: r.reason, status,
      organizationName: r.organization?.name ?? "", requestedByName: name(r.requestedBy) ?? "", requestedById: r.requestedById,
      createdAt: r.createdAt.toISOString(), decidedByName: name(r.decidedBy), decidedAt: r.decidedAt?.toISOString() ?? null, decisionNote: r.decisionNote,
      approvedUntil: r.approvedUntil?.toISOString() ?? null, downloadedAt: r.downloadedAt?.toISOString() ?? null, rowCount: r.rowCount,
      canDownload: status === "APPROVED" && r.requestedById === viewerId,
    };
  }

  private async load(user: RequestUser, id: string): Promise<Row> {
    const include = { organization: { select: { name: true } }, requestedBy: { select: { forename: true, surname: true } }, decidedBy: { select: { forename: true, surname: true } } };
    const row = isGlobalAdmin(user)
      ? await withPlatformStaffContext((tx) => tx.dataExportRequest.findUnique({ where: { id }, include }))
      : await withTenantContext(user.organizationId, (tx) => tx.dataExportRequest.findFirst({ where: { id, organizationId: user.organizationId }, include }));
    if (!row) throw new NotFoundException("Export request not found.");
    return row;
  }

  async list(user: RequestUser): Promise<DataExportRequestSummary[]> {
    const include = { organization: { select: { name: true } }, requestedBy: { select: { forename: true, surname: true } }, decidedBy: { select: { forename: true, surname: true } } };
    const rows = isGlobalAdmin(user)
      ? await withPlatformStaffContext((tx) => tx.dataExportRequest.findMany({ include, orderBy: { createdAt: "desc" }, take: 200 }))
      : await withTenantContext(user.organizationId, (tx) => tx.dataExportRequest.findMany({ where: { organizationId: user.organizationId }, include, orderBy: { createdAt: "desc" }, take: 200 }));
    return rows.map((r) => this.toSummary(r, user.id));
  }

  async create(user: RequestUser, dto: CreateDataExportRequestDto): Promise<DataExportRequestSummary> {
    if (isGlobalAdmin(user)) throw new BadRequestException("Global admins can export the whole catalogue directly; no request is needed.");
    const created = await withTenantContext(user.organizationId, async (tx) => {
      const pending = await tx.dataExportRequest.count({ where: { organizationId: user.organizationId, status: "PENDING" } });
      if (pending >= MAX_PENDING_PER_ORG) throw new BadRequestException(`Your organisation already has ${MAX_PENDING_PER_ORG} requests waiting for a decision.`);
      const row = await tx.dataExportRequest.create({
        data: { organizationId: user.organizationId, requestedById: user.id, scope: dto.scope, filters: dto.filters ? JSON.stringify(dto.filters) : null, reason: dto.reason.trim() },
        include: { organization: { select: { name: true } }, requestedBy: { select: { forename: true, surname: true } }, decidedBy: { select: { forename: true, surname: true } } },
      });
      await recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "data_export_requests", recordId: row.id, changedById: user.id, changes: [{ field: "requested", oldValue: null, newValue: `${dto.scope}: ${dto.reason.trim().slice(0, 300)}` }] });
      return row;
    });
    await this.notifyGlobalAdmins(user, created.id, created.organization?.name ?? "An organisation", dto.scope);
    return this.toSummary(created, user.id);
  }

  private async notifyGlobalAdmins(actor: RequestUser, requestId: string, orgName: string, scope: string): Promise<void> {
    const admins = await withPlatformStaffContext((tx) => tx.user.findMany({ where: { platformStaffRole: "SUPER_ADMIN", status: "ACTIVE" }, select: { id: true, organizationId: true } }));
    const byOrg = new Map<string, string[]>();
    for (const a of admins) byOrg.set(a.organizationId, [...(byOrg.get(a.organizationId) ?? []), a.id]);
    for (const [orgId, ids] of byOrg) {
      await withTenantContext(orgId, (tx) =>
        createNotifications(tx, ids.map((rid) => ({
          organizationId: orgId, recipientUserId: rid, actorUserId: actor.id, kind: "DATA_EXPORT_REQUEST", category: "SYSTEM",
          title: `Export request from ${orgName}`, body: `${orgName} has asked to export the ${scope === "CATALOGUE" ? "product catalogue" : "regulatory registrations"}. Review and approve or reject it.`,
          link: "/exports", subjectType: "data_export_request", subjectId: requestId, requiresAction: true,
        }))),
      );
    }
  }

  async decide(user: RequestUser, id: string, dto: DecideDataExportRequestDto): Promise<DataExportRequestSummary> {
    if (!isGlobalAdmin(user)) throw new ForbiddenException("Only a global admin can decide an export request.");
    const row = await this.load(user, id);
    if (row.status !== "PENDING") throw new BadRequestException("This request has already been decided.");
    if (!dto.approve && !(dto.note && dto.note.trim())) throw new BadRequestException("Please give a reason for rejecting the request.");
    const now = new Date();
    const status = dto.approve ? "APPROVED" : "REJECTED";
    const updated = await withPlatformStaffContext(async (tx) => {
      const claimed = await tx.dataExportRequest.updateMany({
        where: { id, status: "PENDING" },
        data: { status, decidedById: user.id, decidedAt: now, decisionNote: dto.note?.trim() || null, approvedUntil: dto.approve ? new Date(now.getTime() + APPROVAL_DAYS * 86400000) : null },
      });
      if (claimed.count !== 1) throw new BadRequestException("This request has already been decided.");
      await recordFieldChanges(tx, { organizationId: row.organizationId, tableName: "data_export_requests", recordId: id, changedById: user.id, changes: [{ field: "status", oldValue: "PENDING", newValue: status }], reason: dto.note?.trim() || null });
      return tx.dataExportRequest.findUniqueOrThrow({ where: { id }, include: { organization: { select: { name: true } }, requestedBy: { select: { forename: true, surname: true } }, decidedBy: { select: { forename: true, surname: true } } } });
    });
    await withTenantContext(row.organizationId, (tx) =>
      createNotifications(tx, [{
        organizationId: row.organizationId, recipientUserId: row.requestedById, actorUserId: user.id, kind: "DATA_EXPORT_DECISION", category: "SYSTEM",
        title: dto.approve ? "Your export request was approved" : "Your export request was rejected",
        body: dto.approve ? `You can download it once, within ${APPROVAL_DAYS} days, from the Data exports page.` : `Reason: ${dto.note?.trim()}`,
        link: "/exports", subjectType: "data_export_request", subjectId: id, requiresAction: dto.approve,
      }]),
    );
    return this.toSummary(updated, user.id);
  }

  /** The requester downloads an approved export once. The file is built now, from current data, with the filters on the request. */
  async download(user: RequestUser, id: string): Promise<ProductExportFile> {
    const row = await this.load(user, id);
    if (row.requestedById !== user.id) throw new ForbiddenException("Only the person who made the request can download it.");
    if (row.status !== "APPROVED" || !row.approvedUntil || row.approvedUntil < new Date()) throw new BadRequestException("This request is not approved, has expired, or has already been downloaded.");
    const claimed = await withTenantContext(user.organizationId, (tx) => tx.dataExportRequest.updateMany({ where: { id, status: "APPROVED" }, data: { status: "DOWNLOADED", downloadedAt: new Date() } }));
    if (claimed.count !== 1) throw new BadRequestException("This request has already been downloaded.");
    try {
      const filters = parse(row.filters);
      const file = row.scope === "CATALOGUE"
        ? await this.exportsService.catalogueCsv(user, { q: filters.q as string | undefined, category: filters.category as string | undefined, sourceStandard: filters.sourceStandard as string | undefined, includeArchived: filters.includeArchived === true }, true)
        : await this.exportsService.registrationsCsv(user, { status: filters.status as string | undefined, includeArchived: filters.includeArchived === true }, true);
      await withTenantContext(user.organizationId, async (tx) => {
        await tx.dataExportRequest.update({ where: { id }, data: { rowCount: file.rowCount } });
        await recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "data_export_requests", recordId: id, changedById: user.id, changes: [{ field: "downloaded", oldValue: null, newValue: `${file.rowCount} rows` }] });
      });
      return file;
    } catch (e) {
      await withTenantContext(user.organizationId, (tx) => tx.dataExportRequest.updateMany({ where: { id, status: "DOWNLOADED" }, data: { status: "APPROVED", downloadedAt: null } }));
      throw e;
    }
  }
}
