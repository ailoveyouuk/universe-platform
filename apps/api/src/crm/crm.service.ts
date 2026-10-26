import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { Prisma } from "@universe/db";
import { CRM_HEALTH, CRM_STATUSES, CRM_TIERS, crmHealth, type CrmHealth, type CrmOverview, type CrmPeopleOption, type CrmRelationshipPage, type CrmRelationshipRow, type CrmRelationshipUpdate, type CrmStatus, type CrmTier } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";
import { PartnerScorecardService } from "../quality/partner-scorecard.service";

type Tx = Prisma.TransactionClient;
type Facts = Map<string, { open: number | null; expired: number; soon: number }> & { canComplaints: boolean };
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
  constructor(private readonly scorecards: PartnerScorecardService) {}

  private tracking = new Map<string, Promise<number>>();
  /** When each organisation was last checked for stakeholders without a relationship; the check is skipped for two minutes after it passes. */
  private checkedAt = new Map<string, number>();
  /** Overview figures for 45 seconds per organisation and view of complaints; cleared whenever a relationship is changed. */
  private overviewCache = new Map<string, { at: number; value: CrmOverview }>();

  /**
   * Creates a relationship for every stakeholder that lacks one, 1,000 at a time. Two screens open at once (the list and the tiles) would
   * otherwise both try to create the same rows, so one run per organisation at a time is shared, and a unique-key clash from another
   * server instance is retried rather than failed. Returns how many were created.
   */
  private ensureTracked(user: RequestUser): Promise<number> {
    const org = user.organizationId;
    const running = this.tracking.get(org);
    if (running) return running;
    if (Date.now() - (this.checkedAt.get(org) ?? 0) < 120_000) return Promise.resolve(0);
    const run = (async () => {
      let created = 0;
      for (let round = 0; round < 40; round++) {
        try {
          const n = await withTenantContext(org, async (tx) => {
            const missing = await tx.partner.findMany({ where: { organizationId: org, isArchived: false, crmRelationships: { none: {} } }, select: { id: true, approvalStatus: true }, take: 1000 });
            if (!missing.length) return 0;
            const now = new Date();
            await tx.crmRelationship.createMany({ data: missing.map((p) => ({ organizationId: org, partnerId: p.id, counterpartyKey: counterpartyKeyForPartner(p.id), status: startingStatus(p.approvalStatus), reviewIntervalMonths: 12, nextReviewDue: addMonths(now, 12) })) });
            return missing.length;
          });
          if (n === 0) break;
          created += n;
        } catch (e) {
          if (!/unique|duplicate|P2002/i.test(String((e as Error)?.message ?? e))) throw e;
        }
      }
      this.checkedAt.set(org, Date.now());
      return created;
    })().finally(() => this.tracking.delete(org));
    this.tracking.set(org, run);
    return run;
  }

  private async ownerNames(tx: Tx, ids: string[]) {
    const uniq = [...new Set(ids)];
    const users = uniq.length ? await tx.user.findMany({ where: { id: { in: uniq } }, select: { id: true, forename: true, surname: true } }) : [];
    return new Map(users.map((u) => [u.id, `${u.forename} ${u.surname}`.trim()]));
  }

  /**
   * Facts the stakeholder side of Universe already holds, read in two grouped queries for the whole list (not one per row):
   * open quality complaints (only for people allowed to see complaint data) and current certificates past or near expiry.
   */
  private async facts(tx: Tx, user: RequestUser, partnerIds: string[]): Promise<Facts> {
    const map: Facts = Object.assign(new Map<string, { open: number | null; expired: number; soon: number }>(), { canComplaints: user.platformStaffRole !== "NONE" || user.permissions.includes("quality.complaints.view") });
    if (!partnerIds.length) return map;
    const now = new Date(); const soon = new Date(now.getTime() + 60 * 86400000);
    // SQL Server allows about 2,100 parameters in one query, so the stakeholder ids go in chunks.
    const certs: { partnerId: string; expiryDate: Date | null }[] = [];
    const complaints: { partnerId: string | null; _count: { _all: number } }[] = [];
    for (let i = 0; i < partnerIds.length; i += 800) {
      const ids = partnerIds.slice(i, i + 800);
      const [c, q] = await Promise.all([
        tx.partnerCertification.findMany({ where: { organizationId: user.organizationId, partnerId: { in: ids }, status: "CURRENT", expiryDate: { not: null, lte: soon } }, select: { partnerId: true, expiryDate: true }, take: 20000 }),
        map.canComplaints ? tx.qualityComplaint.groupBy({ by: ["partnerId"], where: { organizationId: user.organizationId, partnerId: { in: ids }, archivedAt: null, status: { notIn: ["RESOLVED", "CLOSED", "WITHDRAWN"] } }, _count: { _all: true } }) : Promise.resolve([]),
      ]);
      certs.push(...c); complaints.push(...(q as typeof complaints));
    }
    const slot = (id: string) => { let v = map.get(id); if (!v) { v = { open: map.canComplaints ? 0 : null, expired: 0, soon: 0 }; map.set(id, v); } return v; };
    for (const c of certs) { const v = slot(c.partnerId); if (c.expiryDate! < now) v.expired++; else v.soon++; }
    for (const c of complaints) if (c.partnerId) slot(c.partnerId).open = c._count._all;
    return map;
  }

  private static readonly include = { partner: { select: { name: true, countryCode: true, approvalStatus: true, riskTier: true, nextApprovalReviewDue: true, roles: { where: { isActive: true }, select: { roleType: true } } } } } as const;

  private shape(r: any, owners: Map<string, string>, facts: Facts): CrmRelationshipRow {
    const f = facts.get(r.partnerId ?? "") ?? { open: facts.canComplaints ? 0 : null, expired: 0, soon: 0 };
    const calc = crmHealth({ openComplaints: f.open, certsExpired: f.expired, certsExpiringSoon: f.soon, approvalStatus: r.partner?.approvalStatus ?? null, nextApprovalReviewDue: r.partner?.nextApprovalReviewDue?.toISOString() ?? null, nextReviewDue: r.nextReviewDue?.toISOString() ?? null, status: r.status });
    return {
      id: r.id, partnerId: r.partnerId, name: r.partner?.name ?? "Unknown", countryCode: r.partner?.countryCode ?? null,
      roles: (r.partner?.roles ?? []).map((x: { roleType: string }) => x.roleType), approvalStatus: r.partner?.approvalStatus ?? null, riskTier: r.partner?.riskTier ?? null,
      tier: r.tier as CrmTier, status: r.status as CrmStatus, ownerUserId: r.ownerUserId, ownerName: r.ownerUserId ? owners.get(r.ownerUserId) ?? null : null,
      summary: r.summary, reviewIntervalMonths: r.reviewIntervalMonths, lastReviewedAt: r.lastReviewedAt?.toISOString() ?? null, nextReviewDue: r.nextReviewDue?.toISOString() ?? null,
      health: calc.health, healthReasons: calc.reasons, healthOverride: (r.healthOverride as CrmHealth | null) ?? null, healthOverrideReason: r.healthOverrideReason,
      openComplaints: f.open, certsExpired: f.expired, certsExpiringSoon: f.soon,
      archivedAt: r.archivedAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString(),
    };
  }

  /**
   * The database conditions behind health, so lists and tiles are filtered and counted by the database rather than by loading everything.
   * They mirror crmHealth() exactly: at risk = rejected or suspended approval, or an expired current certificate; needs attention adds a
   * pending approval, an overdue approval or relationship review, a certificate expiring within 60 days, and (for people who may see
   * complaint data) an open quality complaint.
   */
  private healthWhere(level: "AT_RISK" | "ATTENTION", canComplaints: boolean, now = new Date()): Prisma.CrmRelationshipWhereInput {
    const soon = new Date(now.getTime() + 60 * 86400000);
    const atRisk: Prisma.CrmRelationshipWhereInput[] = [
      { partner: { approvalStatus: { in: ["REJECTED", "SUSPENDED"] } } },
      { partner: { certifications: { some: { status: "CURRENT", expiryDate: { lt: now } } } } },
    ];
    if (level === "AT_RISK") return { OR: atRisk };
    return { OR: [
      ...atRisk,
      { partner: { approvalStatus: "PENDING" } },
      { partner: { nextApprovalReviewDue: { lt: now } } },
      { status: { notIn: ["ENDED", "PROSPECT"] }, nextReviewDue: { lt: now } },
      { partner: { certifications: { some: { status: "CURRENT", expiryDate: { gte: now, lte: soon } } } } },
      ...(canComplaints ? [{ partner: { qualityComplaints: { some: { archivedAt: null, status: { notIn: ["RESOLVED", "CLOSED", "WITHDRAWN"] } } } } } as Prisma.CrmRelationshipWhereInput] : []),
    ] };
  }

  private canSeeComplaints(user: RequestUser) { return user.platformStaffRole !== "NONE" || user.permissions.includes("quality.complaints.view"); }

  async list(user: RequestUser, q: CrmListQuery): Promise<CrmRelationshipPage> {
    assertHasPermission(user, "crm.view");
    await this.ensureTracked(user);
    const now = new Date();
    const canComplaints = this.canSeeComplaints(user);
    const pageSize = Math.min(Math.max(q.pageSize ?? 25, 1), 100);
    const page = Math.max(q.page ?? 1, 1);
    return withTenantContext(user.organizationId, async (tx) => {
      const and: Prisma.CrmRelationshipWhereInput[] = [{ organizationId: user.organizationId, archivedAt: q.archived === "true" ? { not: null } : null }];
      const needle = q.q?.trim();
      if (needle) {
        const owners = await tx.user.findMany({ where: { organizationId: user.organizationId, OR: [{ forename: { contains: needle } }, { surname: { contains: needle } }] }, select: { id: true }, take: 50 });
        and.push({ OR: [{ partner: { name: { contains: needle } } }, { partner: { countryCode: { contains: needle } } }, { summary: { contains: needle } }, ...(owners.length ? [{ ownerUserId: { in: owners.map((o) => o.id) } }] : [])] });
      }
      if (q.tier) and.push({ tier: q.tier });
      if (q.status) and.push({ status: q.status });
      if (q.role) and.push({ partner: { roles: { some: { roleType: q.role, isActive: true } } } });
      if (q.owner === "none") and.push({ ownerUserId: null, status: { not: "ENDED" } });
      else if (q.owner === "me") and.push({ ownerUserId: user.id });
      else if (q.owner) and.push({ ownerUserId: q.owner });
      if (q.health === "attention") and.push({ status: { not: "ENDED" } }, this.healthWhere("ATTENTION", canComplaints, now));
      else if (q.health === "AT_RISK") and.push({ status: { not: "ENDED" } }, this.healthWhere("AT_RISK", canComplaints, now));
      if (q.review === "due") and.push({ status: { not: "ENDED" }, nextReviewDue: { lt: now } });
      const where: Prisma.CrmRelationshipWhereInput = { AND: and };
      const dir = q.dir === "desc" ? "desc" : "asc";
      const orderBy: Prisma.CrmRelationshipOrderByWithRelationInput[] =
        q.sort === "tier" ? [{ tier: dir }, { partner: { name: "asc" } }] : q.sort === "status" ? [{ status: dir }, { partner: { name: "asc" } }] :
        q.sort === "review" ? [{ nextReviewDue: dir }, { partner: { name: "asc" } }] : [{ partner: { name: dir } }, { id: "asc" }];
      const [total, rows] = await Promise.all([
        tx.crmRelationship.count({ where }),
        tx.crmRelationship.findMany({ where, include: CrmService.include, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      ]);
      const owners = await this.ownerNames(tx, rows.map((r) => r.ownerUserId).filter((x): x is string => !!x));
      const facts = await this.facts(tx, user, rows.map((r) => r.partnerId).filter((x): x is string => !!x));
      return { items: rows.map((r) => this.shape(r, owners, facts)), total, page, pageSize };
    });
  }

  async overview(user: RequestUser): Promise<CrmOverview> {
    assertHasPermission(user, "crm.view");
    await this.ensureTracked(user);
    const now = new Date();
    const canComplaints = this.canSeeComplaints(user);
    const cacheKey = `${user.organizationId}:${canComplaints}`;
    const hit = this.overviewCache.get(cacheKey);
    if (hit && Date.now() - hit.at < 45_000) return hit.value;
    const value = await withTenantContext(user.organizationId, async (tx) => {
      const base: Prisma.CrmRelationshipWhereInput = { organizationId: user.organizationId, archivedAt: null };
      const open: Prisma.CrmRelationshipWhereInput = { ...base, status: { not: "ENDED" } };
      const [total, tiers, statuses, needsAttention, reviewDue, unowned, untracked] = await Promise.all([
        tx.crmRelationship.count({ where: base }),
        tx.crmRelationship.groupBy({ by: ["tier"], where: base, _count: { _all: true } }),
        tx.crmRelationship.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
        tx.crmRelationship.count({ where: { AND: [open, this.healthWhere("ATTENTION", canComplaints, now)] } }),
        tx.crmRelationship.count({ where: { ...open, nextReviewDue: { lt: now } } }),
        tx.crmRelationship.count({ where: { ...open, ownerUserId: null } }),
        tx.partner.count({ where: { organizationId: user.organizationId, isArchived: false, crmRelationships: { none: {} } } }),
      ]);
      const byTier = Object.fromEntries(CRM_TIERS.map((t) => [t, 0])) as Record<CrmTier, number>;
      const byStatus = Object.fromEntries(CRM_STATUSES.map((t) => [t, 0])) as Record<CrmStatus, number>;
      for (const t of tiers) byTier[t.tier as CrmTier] = t._count._all;
      for (const t of statuses) byStatus[t.status as CrmStatus] = t._count._all;
      return { total, active: byStatus.ACTIVE, byTier, byStatus, untracked, needsAttention, reviewDue, unowned };
    });
    this.overviewCache.set(cacheKey, { at: Date.now(), value });
    return value;
  }

  async one(user: RequestUser, id: string): Promise<CrmRelationshipRow> {
    assertHasPermission(user, "crm.view");
    return withTenantContext(user.organizationId, async (tx) => {
      const r = await tx.crmRelationship.findFirst({ where: { id, organizationId: user.organizationId }, include: CrmService.include });
      if (!r) throw new NotFoundException("Relationship not found.");
      return this.shape(r, await this.ownerNames(tx, r.ownerUserId ? [r.ownerUserId] : []), await this.facts(tx, user, r.partnerId ? [r.partnerId] : []));
    });
  }

  /** The stakeholder's existing quality scorecard (the same calculation Project Management shows), for the relationship detail. */
  async scorecard(user: RequestUser, id: string) {
    assertHasPermission(user, "crm.view");
    const partnerId = await withTenantContext(user.organizationId, async (tx) => (await tx.crmRelationship.findFirst({ where: { id, organizationId: user.organizationId }, select: { partnerId: true } }))?.partnerId);
    if (!partnerId) throw new NotFoundException("Relationship not found.");
    return this.scorecards.get(user, partnerId);
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
      for (const k of [...this.overviewCache.keys()]) if (k.startsWith(`${user.organizationId}:`)) this.overviewCache.delete(k);
    });
    return this.one(user, id);
  }
}
