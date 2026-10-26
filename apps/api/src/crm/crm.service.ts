import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import { CRM_HEALTH, CRM_STATUSES, CRM_TIERS, crmHealth, type CrmHealth, type CrmOverview, type CrmPeopleOption, type CrmRelationshipPage, type CrmRelationshipRow, type CrmRelationshipUpdate, type CrmStatus, type CrmTier } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";

export interface CrmListQuery { page?: number; pageSize?: number; q?: string; tier?: string; status?: string; owner?: string; health?: string; review?: string; role?: string; archived?: string; sort?: string; dir?: string }

const addMonths = (d: Date, m: number) => { const n = new Date(d); n.setMonth(n.getMonth() + m); return n; };
/** The relationship status a stakeholder starts with: approved stakeholders are active, everything else is still a prospect. */
export const startingStatus = (approvalStatus: string): CrmStatus => (approvalStatus === "APPROVED" ? "ACTIVE" : "PROSPECT");
export const counterpartyKeyForPartner = (partnerId: string) => `partner:${partnerId}`;

/**
 * CRM relationships (2026-10-26, step 1). A relationship record sits on top of a stakeholder (Partner) and adds ownership, tier, status and
 * review cadence. Every stakeholder gets one automatically the first time the CRM is opened, so the list is never empty and nothing has to be
 * keyed twice. Health is calculated from facts that already exist (approval status, review dates), never typed; a manager may record their own
 * judgement beside it, with a reason. Nothing is deleted: a relationship is archived.
 */
@Injectable()
export class CrmService {
  /** Creates a relationship for every stakeholder that lacks one (up to 1,000 per call). Returns how many were created. */
  private async ensureTracked(user: RequestUser): Promise<number> {
    return withTenantContext(user.organizationId, async (tx) => {
      const missing = await tx.partner.findMany({
        where: { organizationId: user.organizationId, isArchived: false, crmRelationships: { none: {} } },
        select: { id: true, approvalStatus: true }, take: 1000,
      });
      if (!missing.length) return 0;
      const now = new Date();
      await tx.crmRelationship.createMany({
        data: missing.map((p) => ({
          organizationId: user.organizationId, partnerId: p.id, counterpartyKey: counterpartyKeyForPartner(p.id),
          status: startingStatus(p.approvalStatus), reviewIntervalMonths: 12, nextReviewDue: addMonths(now, 12),
        })),
      });
      return missing.length;
    });
  }

  private async ownerNames(tx: Parameters<Parameters<typeof withTenantContext>[1]>[0], ids: string[]) {
    const uniq = [...new Set(ids)];
    const users = uniq.length ? await tx.user.findMany({ where: { id: { in: uniq } }, select: { id: true, forename: true, surname: true } }) : [];
    return new Map(users.map((u) => [u.id, `${u.forename} ${u.surname}`.trim()]));
  }

  private static readonly include = { partner: { select: { name: true, countryCode: true, approvalStatus: true, riskTier: true, nextApprovalReviewDue: true, roles: { where: { isActive: true }, select: { roleType: true } } } } } as const;

  private shape(r: any, owners: Map<string, string>): CrmRelationshipRow {
    const calc = crmHealth({ approvalStatus: r.partner?.approvalStatus ?? null, nextApprovalReviewDue: r.partner?.nextApprovalReviewDue?.toISOString() ?? null, nextReviewDue: r.nextReviewDue?.toISOString() ?? null, status: r.status });
    return {
      id: r.id, partnerId: r.partnerId, name: r.partner?.name ?? "Unknown", countryCode: r.partner?.countryCode ?? null,
      roles: (r.partner?.roles ?? []).map((x: { roleType: string }) => x.roleType), approvalStatus: r.partner?.approvalStatus ?? null, riskTier: r.partner?.riskTier ?? null,
      tier: r.tier as CrmTier, status: r.status as CrmStatus, ownerUserId: r.ownerUserId, ownerName: r.ownerUserId ? owners.get(r.ownerUserId) ?? null : null,
      summary: r.summary, reviewIntervalMonths: r.reviewIntervalMonths, lastReviewedAt: r.lastReviewedAt?.toISOString() ?? null, nextReviewDue: r.nextReviewDue?.toISOString() ?? null,
      health: calc.health, healthReasons: calc.reasons, healthOverride: (r.healthOverride as CrmHealth | null) ?? null, healthOverrideReason: r.healthOverrideReason,
      archivedAt: r.archivedAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString(),
    };
  }

  /** Every relationship for the organisation, shaped, newest data first. Capped so a very large organisation stays quick. */
  private async all(user: RequestUser, archived: boolean) {
    await this.ensureTracked(user);
    return withTenantContext(user.organizationId, async (tx) => {
      const rows = await tx.crmRelationship.findMany({
        where: { organizationId: user.organizationId, archivedAt: archived ? { not: null } : null }, include: CrmService.include, take: 5000, orderBy: { createdAt: "desc" },
      });
      const owners = await this.ownerNames(tx, rows.map((r) => r.ownerUserId).filter((x): x is string => !!x));
      return rows.map((r) => this.shape(r, owners));
    });
  }

  async list(user: RequestUser, q: CrmListQuery): Promise<CrmRelationshipPage> {
    assertHasPermission(user, "crm.view");
    const now = Date.now();
    const all = await this.all(user, q.archived === "true");
    const needle = q.q?.trim().toLowerCase();
    let rows = all.filter((r) => {
      if (needle && !`${r.name} ${r.summary ?? ""} ${r.ownerName ?? ""} ${r.roles.join(" ")} ${r.countryCode ?? ""}`.toLowerCase().includes(needle)) return false;
      if (q.tier && r.tier !== q.tier) return false;
      if (q.status && r.status !== q.status) return false;
      if (q.role && !r.roles.includes(q.role)) return false;
      if (q.owner === "none" ? r.ownerUserId : q.owner === "me" ? r.ownerUserId !== user.id : q.owner ? r.ownerUserId !== q.owner : false) return false;
      if (q.health === "attention" ? r.health === "GOOD" || r.status === "ENDED" : q.health && r.health !== q.health) return false;
      if (q.owner === "none" && r.status === "ENDED") return false;
      if (q.review === "due" && !(r.nextReviewDue && new Date(r.nextReviewDue).getTime() < now && r.status !== "ENDED")) return false;
      return true;
    });
    const dir = q.dir === "desc" ? -1 : 1;
    const key: Record<string, (r: CrmRelationshipRow) => string | number> = {
      name: (r) => r.name.toLowerCase(), tier: (r) => CRM_TIERS.indexOf(r.tier), status: (r) => CRM_STATUSES.indexOf(r.status),
      health: (r) => CRM_HEALTH.indexOf(r.health), review: (r) => r.nextReviewDue ?? "9999", owner: (r) => (r.ownerName ?? "~").toLowerCase(),
    };
    const k = key[q.sort ?? "name"] ?? key.name!;
    rows = [...rows].sort((a, b) => { const x = k(a), y = k(b); return (x < y ? -1 : x > y ? 1 : a.name.localeCompare(b.name)) * dir; });
    const pageSize = Math.min(Math.max(q.pageSize ?? 25, 1), 100);
    const page = Math.max(q.page ?? 1, 1);
    return { rows: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize };
  }

  async overview(user: RequestUser): Promise<CrmOverview> {
    assertHasPermission(user, "crm.view");
    const now = Date.now();
    const all = await this.all(user, false);
    const byTier = Object.fromEntries(CRM_TIERS.map((t) => [t, 0])) as Record<CrmTier, number>;
    const byStatus = Object.fromEntries(CRM_STATUSES.map((t) => [t, 0])) as Record<CrmStatus, number>;
    for (const r of all) { byTier[r.tier]++; byStatus[r.status]++; }
    const untracked = await withTenantContext(user.organizationId, (tx) => tx.partner.count({ where: { organizationId: user.organizationId, isArchived: false, crmRelationships: { none: {} } } }));
    return {
      total: all.length, active: byStatus.ACTIVE, byTier, byStatus, untracked,
      needsAttention: all.filter((r) => r.health !== "GOOD" && r.status !== "ENDED").length,
      reviewDue: all.filter((r) => r.status !== "ENDED" && r.nextReviewDue && new Date(r.nextReviewDue).getTime() < now).length,
      unowned: all.filter((r) => !r.ownerUserId && r.status !== "ENDED").length,
    };
  }

  async one(user: RequestUser, id: string): Promise<CrmRelationshipRow> {
    assertHasPermission(user, "crm.view");
    return withTenantContext(user.organizationId, async (tx) => {
      const r = await tx.crmRelationship.findFirst({ where: { id, organizationId: user.organizationId }, include: CrmService.include });
      if (!r) throw new NotFoundException("Relationship not found.");
      return this.shape(r, await this.ownerNames(tx, r.ownerUserId ? [r.ownerUserId] : []));
    });
  }

  /** Colleagues in the organisation who can own a relationship. */
  async people(user: RequestUser): Promise<CrmPeopleOption[]> {
    assertHasPermission(user, "crm.view");
    return withTenantContext(user.organizationId, async (tx) => {
      const us = await tx.user.findMany({ where: { organizationId: user.organizationId, archivedAt: null, isSimulated: false }, select: { id: true, forename: true, surname: true }, orderBy: [{ forename: "asc" }], take: 200 });
      return us.map((u) => ({ id: u.id, name: `${u.forename} ${u.surname}`.trim() }));
    });
  }

  async update(user: RequestUser, id: string, dto: CrmRelationshipUpdate): Promise<CrmRelationshipRow> {
    assertHasPermission(user, "crm.manage");
    if (dto.tier && !CRM_TIERS.includes(dto.tier)) throw new BadRequestException("Choose a tier from the list.");
    if (dto.status && !CRM_STATUSES.includes(dto.status)) throw new BadRequestException("Choose a status from the list.");
    if (dto.healthOverride && !CRM_HEALTH.includes(dto.healthOverride)) throw new BadRequestException("Choose a health from the list.");
    if (dto.healthOverride && !dto.healthOverrideReason?.trim()) throw new BadRequestException("Say why you are overriding the calculated health.");
    if (dto.reviewIntervalMonths !== undefined && (!Number.isInteger(dto.reviewIntervalMonths) || dto.reviewIntervalMonths < 1 || dto.reviewIntervalMonths > 60)) throw new BadRequestException("Review interval must be 1 to 60 months.");
    await withTenantContext(user.organizationId, async (tx) => {
      const cur = await tx.crmRelationship.findFirst({ where: { id, organizationId: user.organizationId } });
      if (!cur) throw new NotFoundException("Relationship not found.");
      if (dto.ownerUserId) {
        const ok = await tx.user.findFirst({ where: { id: dto.ownerUserId, organizationId: user.organizationId, archivedAt: null }, select: { id: true } });
        if (!ok) throw new BadRequestException("The owner must be someone in your organisation.");
      }
      const interval = dto.reviewIntervalMonths ?? cur.reviewIntervalMonths;
      const now = new Date();
      const data: Record<string, unknown> = {};
      if (dto.tier) data.tier = dto.tier;
      if (dto.status) data.status = dto.status;
      if (dto.ownerUserId !== undefined) data.ownerUserId = dto.ownerUserId;
      if (dto.summary !== undefined) data.summary = dto.summary?.trim().slice(0, 2000) || null;
      if (dto.reviewIntervalMonths !== undefined) { data.reviewIntervalMonths = interval; data.nextReviewDue = addMonths(cur.lastReviewedAt ?? now, interval); }
      if (dto.markReviewed) { data.lastReviewedAt = now; data.nextReviewDue = addMonths(now, interval); }
      if (dto.healthOverride !== undefined) { data.healthOverride = dto.healthOverride; data.healthOverrideReason = dto.healthOverride ? dto.healthOverrideReason!.trim().slice(0, 500) : null; }
      if (dto.archived !== undefined) { data.archivedAt = dto.archived ? now : null; data.archivedById = dto.archived ? user.id : null; }
      await tx.crmRelationship.update({ where: { id }, data });
    });
    return this.one(user, id);
  }
}
