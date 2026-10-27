import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, withTenantContext } from "@universe/db";
import { canUseApp, CRM_HEALTH, CRM_PROJECT_PARTS, CRM_STATUSES, CRM_TIERS, crmHealth, crmRecencyCutoff, type CrmHealth, type CrmLastProject, type CrmLink, type CrmLocation, type CrmPortfolio, type CrmPortfolioMap, type CrmProjectPage, type CrmWorkBucket, type CrmOverview, type CrmPeopleOption, type CrmRelationshipDetail, type CrmRelationshipPage, type CrmRelationshipRow, type CrmRelationshipUpdate, type CrmStatus, type CrmTier } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
import { assertHasPermission } from "../common/authorization";
import { completeActionsFor } from "../notifications/notify";
import { PartnerScorecardService } from "../quality/partner-scorecard.service";

type Tx = Prisma.TransactionClient;
type Facts = Map<string, { open: number | null; expired: number; soon: number }> & { canComplaints: boolean };
export interface CrmListQuery { page?: number; pageSize?: number; q?: string; tier?: string; status?: string; owner?: string; health?: string; review?: string; role?: string; tag?: string; work?: string; country?: string; view?: string; archived?: string; sort?: string; dir?: string }

const addMonths = (d: Date, m: number) => { const n = new Date(d); n.setMonth(n.getMonth() + m); return n; };
/** The relationship status a stakeholder starts with: approved stakeholders are active, everything else is still a prospect. */
export const startingStatus = (approvalStatus: string): CrmStatus => (approvalStatus === "APPROVED" ? "ACTIVE" : "PROSPECT");
export const counterpartyKeyForPartner = (partnerId: string) => `partner:${partnerId}`;
/** A web address that is safe to show as a link: http or https only. Returns null for anything else (so a javascript: address can never become a link). */
export function safeUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim(); if (!t) return null;
  try { const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`); return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null; } catch { return null; }
}

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

  private static readonly include = { interactions: { where: { archivedAt: null }, orderBy: { occurredAt: "desc" as const }, take: 1, select: { occurredAt: true } }, partner: { select: { name: true, countryCode: true, createdAt: true, updatedAt: true, approvalStatus: true, riskTier: true, nextApprovalReviewDue: true, roles: { where: { isActive: true }, select: { roleType: true } } } }, tagLinks: { where: { removedAt: null, tag: { archivedAt: null } }, select: { tag: { select: { id: true, name: true } } } } } as const;

  private shape(r: any, owners: Map<string, string>, facts: Facts): CrmRelationshipRow {
    const f = facts.get(r.partnerId ?? "") ?? { open: facts.canComplaints ? 0 : null, expired: 0, soon: 0 };
    const calc = crmHealth({ openComplaints: f.open, certsExpired: f.expired, certsExpiringSoon: f.soon, approvalStatus: r.partner?.approvalStatus ?? null, nextApprovalReviewDue: r.partner?.nextApprovalReviewDue?.toISOString() ?? null, nextReviewDue: r.nextReviewDue?.toISOString() ?? null, status: r.status, tier: r.tier, createdAt: r.createdAt?.toISOString() ?? null, lastInteractionAt: r.interactions?.[0]?.occurredAt?.toISOString() ?? null });
    return {
      id: r.id, partnerId: r.partnerId, name: r.partner?.name ?? "Unknown", countryCode: r.partner?.countryCode ?? null,
      roles: (r.partner?.roles ?? []).map((x: { roleType: string }) => x.roleType), approvalStatus: r.partner?.approvalStatus ?? null, riskTier: r.partner?.riskTier ?? null,
      tier: r.tier as CrmTier, status: r.status as CrmStatus, ownerUserId: r.ownerUserId, ownerName: r.ownerUserId ? owners.get(r.ownerUserId) ?? null : null,
      summary: r.summary, reviewIntervalMonths: r.reviewIntervalMonths, lastReviewedAt: r.lastReviewedAt?.toISOString() ?? null, nextReviewDue: r.nextReviewDue?.toISOString() ?? null,
      health: calc.health, healthReasons: calc.reasons, healthOverride: (r.healthOverride as CrmHealth | null) ?? null, healthOverrideReason: r.healthOverrideReason,
      openComplaints: f.open, certsExpired: f.expired, certsExpiringSoon: f.soon,
      tags: ((r.tagLinks ?? []) as { tag: { id: string; name: string } }[]).map((l) => l.tag).sort((a, b) => a.name.localeCompare(b.name)),
      partnerAddedAt: r.partner?.createdAt?.toISOString() ?? null, partnerUpdatedAt: r.partner?.updatedAt?.toISOString() ?? null,
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
      // Interaction recency: an active relationship older than its tier's window with no interaction inside it.
      ...(["STRATEGIC", "KEY", "STANDARD", "WATCH"] as const).map((t): Prisma.CrmRelationshipWhereInput => { const c = crmRecencyCutoff(t, now); return { tier: t, status: "ACTIVE", createdAt: { lt: c }, interactions: { none: { archivedAt: null, occurredAt: { gte: c } } } }; }),
      ...(canComplaints ? [{ partner: { qualityComplaints: { some: { archivedAt: null, status: { notIn: ["RESOLVED", "CLOSED", "WITHDRAWN"] } } } } } as Prisma.CrmRelationshipWhereInput] : []),
    ] };
  }

  private canSeeProjects(user: RequestUser) { const staff = user.platformStaffRole !== "NONE"; return (staff || canUseApp(user.apps, "project-management")) && (staff || user.permissions.includes("projects.view")); }
  private canSeeComplaints(user: RequestUser) { return user.platformStaffRole !== "NONE" || user.permissions.includes("quality.complaints.view"); }

  /** The database conditions behind every list filter, shared by the table and the portfolio map so the two always agree. */
  private async listWhere(tx: Tx, user: RequestUser, q: CrmListQuery, now: Date, canComplaints: boolean): Promise<Prisma.CrmRelationshipWhereInput> {
      const and: Prisma.CrmRelationshipWhereInput[] = [{ organizationId: user.organizationId, archivedAt: q.archived === "true" ? { not: null } : null }];
      const needle = q.q?.trim();
      if (needle) {
        const owners = await tx.user.findMany({ where: { organizationId: user.organizationId, OR: [{ forename: { contains: needle } }, { surname: { contains: needle } }] }, select: { id: true }, take: 50 });
        and.push({ OR: [{ partner: { name: { contains: needle } } }, { partner: { countryCode: { contains: needle } } }, { summary: { contains: needle } }, ...(owners.length ? [{ ownerUserId: { in: owners.map((o) => o.id) } }] : [])] });
      }
      if (q.work && this.canSeeProjects(user)) { const w = this.workWhere(q.work); if (w) and.push(w); }
      if (q.country && /^[A-Za-z]{2,3}$/.test(q.country)) and.push({ partner: { countryCode: q.country.toUpperCase() } });
      if (q.tag) and.push({ tagLinks: { some: { tagId: q.tag, removedAt: null } } });
      if (q.tier) and.push({ tier: q.tier });
      if (q.status) and.push({ status: q.status });
      if (q.role) and.push({ partner: { roles: { some: { roleType: q.role, isActive: true } } } });
      if (q.owner === "none") and.push({ ownerUserId: null, status: { not: "ENDED" } });
      else if (q.owner === "me") and.push({ ownerUserId: user.id });
      else if (q.owner) and.push({ ownerUserId: q.owner });
      if (q.health === "attention") and.push({ status: { not: "ENDED" } }, this.healthWhere("ATTENTION", canComplaints, now));
      else if (q.health === "AT_RISK") and.push({ status: { not: "ENDED" } }, this.healthWhere("AT_RISK", canComplaints, now));
      if (q.review === "due") and.push({ status: { not: "ENDED" }, nextReviewDue: { lt: now } });
      return { AND: and };
  }

  /**
   * Where the filtered stakeholders are based, by country and kind, for the portfolio map, plus how many of them have each kind of work (for the tiles).
   * Ids are read once, then the grouping is done by the database over a single JSON parameter (SQL Server limits a query to about 2,100 parameters).
   * The work filter is ignored here on purpose: the tiles are the way you choose it. Capped so the map stays fast on very large books.
   */
  async portfolioMap(user: RequestUser, q: CrmListQuery): Promise<CrmPortfolioMap> {
    assertHasPermission(user, "crm.view");
    const now = new Date();
    const cap = 6000;
    const seeWork = this.canSeeProjects(user);
    return withTenantContext(user.organizationId, async (tx) => {
      const { work: _ignored, ...rest } = q;
      const where = await this.listWhere(tx, user, rest, now, this.canSeeComplaints(user));
      const rows = await tx.crmRelationship.findMany({ where, select: { partnerId: true, partner: { select: { countryCode: true } } }, take: cap + 1 });
      // Tiles count the whole filtered set; the pips narrow further when a work tile is chosen.
      const wset = q.work && seeWork ? await this.listWhere(tx, user, q, now, this.canSeeComplaints(user)) : null;
      const used = wset ? (await tx.crmRelationship.findMany({ where: wset, select: { partnerId: true, partner: { select: { countryCode: true } } }, take: cap })) : rows.slice(0, cap);
      const ids = rows.slice(0, cap).map((r) => r.partnerId).filter((x): x is string => !!x);
      const json = JSON.stringify(ids);
      const org = user.organizationId;
      const ofIds = Prisma.sql`OPENJSON(${json}) WITH (id nvarchar(450) '$')`;
      const [roleRows, workRows] = await Promise.all([
        ids.length ? tx.$queryRaw<{ pid: string; roleType: string }[]>(Prisma.sql`SELECT r.partnerId AS pid, r.roleType AS roleType FROM partner_roles r JOIN ${ofIds} j ON j.id = r.partnerId WHERE r.isActive = 1`) : Promise.resolve([]),
        seeWork && ids.length ? tx.$queryRaw<{ bucket: string; n: number | bigint }[]>(Prisma.sql`
          SELECT x.bucket AS bucket, COUNT(DISTINCT t.pid) AS n FROM (
            SELECT p.clientId AS pid, p.status AS status FROM projects p JOIN ${ofIds} j ON j.id = p.clientId WHERE p.organizationId = ${org} AND p.archivedAt IS NULL
            UNION SELECT p.freightForwarderId, p.status FROM projects p JOIN ${ofIds} j ON j.id = p.freightForwarderId WHERE p.organizationId = ${org} AND p.archivedAt IS NULL
            UNION SELECT l.supplierId, p.status FROM project_lines l JOIN projects p ON p.id = l.projectId JOIN ${ofIds} j ON j.id = l.supplierId WHERE p.organizationId = ${org} AND p.archivedAt IS NULL AND l.archivedAt IS NULL
            UNION SELECT l.manufacturerId, p.status FROM project_lines l JOIN projects p ON p.id = l.projectId JOIN ${ofIds} j ON j.id = l.manufacturerId WHERE p.organizationId = ${org} AND p.archivedAt IS NULL AND l.archivedAt IS NULL
          ) t CROSS APPLY (SELECT CASE t.status WHEN 'IN_PROGRESS' THEN 'in_progress' WHEN 'SUBMITTED' THEN 'submitted' WHEN 'AWARDED' THEN 'awarded' WHEN 'COMPLETED' THEN 'completed' WHEN 'UNAWARDED' THEN 'unawarded' WHEN 'DECLINED' THEN 'unawarded' END AS bucket) x(bucket)
          WHERE x.bucket IS NOT NULL GROUP BY x.bucket`) : Promise.resolve(null),
      ]);
      const order = ["CLIENT", "MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "WAREHOUSING"];
      const rolesBy = new Map<string, string[]>();
      for (const r of roleRows) rolesBy.set(r.pid, [...(rolesBy.get(r.pid) ?? []), r.roleType]);
      const counts = new Map<string, number>(); let noCountry = 0;
      for (const r of used) {
        const code = r.partner?.countryCode;
        if (!code) { noCountry++; continue; }
        const roles = rolesBy.get(r.partnerId ?? "") ?? [];
        const kind = order.find((o) => roles.includes(o)) ?? "OTHER";
        counts.set(`${code}|${kind}`, (counts.get(`${code}|${kind}`) ?? 0) + 1);
      }
      const work = workRows ? Object.fromEntries(["in_progress", "submitted", "awarded", "completed", "unawarded"].map((k) => [k, Number(workRows.find((w) => w.bucket === k)?.n ?? 0)])) : null;
      return { points: [...counts].map(([k, count]) => { const [countryCode, kind] = k.split("|"); return { countryCode, kind, count }; }), noCountry, capped: rows.length > cap, work };
    });
  }

  async list(user: RequestUser, q: CrmListQuery): Promise<CrmRelationshipPage> {
    assertHasPermission(user, "crm.view");
    await this.ensureTracked(user);
    const now = new Date();
    const canComplaints = this.canSeeComplaints(user);
    const pageSize = Math.min(Math.max(q.pageSize ?? 25, 1), 100);
    const page = Math.max(q.page ?? 1, 1);
    return withTenantContext(user.organizationId, async (tx) => {
      const where = await this.listWhere(tx, user, q, now, canComplaints);
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
      const items = rows.map((r) => this.shape(r, owners, facts));
      if (q.view === "portfolio") await this.attachPortfolio(tx, user, items);
      return { items, total, page, pageSize };
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

  /**
   * Counts a stakeholder's projects by outcome in the database, and finds the most recent one. A project counts once per stakeholder however many hats
   * they wore (client, freight forwarder, supplier or manufacturer on a line). Cancelled projects are left out of the counts but can still be the latest.
   */
  private async portfolioFor(tx: Prisma.TransactionClient, org: string, ids: string[]): Promise<Map<string, CrmPortfolio>> {
    const out = new Map<string, CrmPortfolio>();
    if (!ids.length) return out;
    const list = Prisma.join(ids);
    const union = Prisma.sql`
        SELECT p.clientId AS pid, p.id AS id, p.status AS status, p.createdAt AS createdAt FROM projects p WHERE p.organizationId = ${org} AND p.archivedAt IS NULL AND p.clientId IN (${list})
        UNION SELECT p.freightForwarderId, p.id, p.status, p.createdAt FROM projects p WHERE p.organizationId = ${org} AND p.archivedAt IS NULL AND p.freightForwarderId IN (${list})
        UNION SELECT l.supplierId, p.id, p.status, p.createdAt FROM project_lines l JOIN projects p ON p.id = l.projectId WHERE p.organizationId = ${org} AND p.archivedAt IS NULL AND l.archivedAt IS NULL AND l.supplierId IN (${list})
        UNION SELECT l.manufacturerId, p.id, p.status, p.createdAt FROM project_lines l JOIN projects p ON p.id = l.projectId WHERE p.organizationId = ${org} AND p.archivedAt IS NULL AND l.archivedAt IS NULL AND l.manufacturerId IN (${list})`;
    const [rows, latest] = await Promise.all([
      tx.$queryRaw<{ pid: string; status: string; n: number | bigint }[]>(Prisma.sql`SELECT t.pid AS pid, t.status AS status, COUNT(*) AS n FROM (${union}) t GROUP BY t.pid, t.status`),
      tx.$queryRaw<{ pid: string; id: string; createdAt: Date }[]>(Prisma.sql`SELECT x.pid AS pid, x.id AS id, x.createdAt AS createdAt FROM (SELECT t.pid, t.id, t.createdAt, ROW_NUMBER() OVER (PARTITION BY t.pid ORDER BY t.createdAt DESC) AS rn FROM (${union}) t) x WHERE x.rn = 1`),
    ]);
    const empty = (): CrmPortfolio => ({ identified: 0, inProgress: 0, submitted: 0, awarded: 0, completed: 0, unawarded: 0, total: 0, lastProject: null });
    for (const id of ids) out.set(id, empty());
    const keyOf = { IDENTIFIED: "identified", IN_PROGRESS: "inProgress", SUBMITTED: "submitted", AWARDED: "awarded", COMPLETED: "completed", UNAWARDED: "unawarded", DECLINED: "unawarded" } as Record<string, CrmWorkBucket | undefined>;
    for (const r of rows) {
      const c = out.get(r.pid); if (!c) continue;
      const key = keyOf[r.status];
      if (!key) continue; // cancelled projects are not part of the picture
      const n = Number(r.n); c[key] += n; c.total += n;
    }
    if (latest.length) {
      const projects = await tx.project.findMany({ where: { id: { in: latest.map((l) => l.id) } }, select: { id: true, referenceNumber: true, title: true, status: true, createdAt: true } });
      const byId = new Map(projects.map((p) => [p.id, p]));
      for (const l of latest) {
        const p = byId.get(l.id); const c = out.get(l.pid); if (!p || !c) continue;
        c.lastProject = { id: p.id, referenceNumber: p.referenceNumber, title: p.title, date: p.createdAt.toISOString(), status: p.status } as CrmLastProject;
      }
    }
    return out;
  }

  /** Adds the portfolio columns (projects by outcome, contacts, sites) to a page of rows, for the people allowed to see them. */
  private async attachPortfolio(tx: Prisma.TransactionClient, user: RequestUser, items: CrmRelationshipRow[]) {
    const staff = user.platformStaffRole !== "NONE";
    const inPm = staff || canUseApp(user.apps, "project-management");
    const seeProjects = inPm && (staff || user.permissions.includes("projects.view"));
    const ids = items.map((i) => i.partnerId).filter((x): x is string => !!x);
    const rels = items.map((i) => i.id);
    const [port, contacts, sites, places] = await Promise.all([
      seeProjects ? this.portfolioFor(tx, user.organizationId, ids) : Promise.resolve(null),
      inPm && ids.length ? tx.contact.groupBy({ by: ["partnerId"], where: { organizationId: user.organizationId, partnerId: { in: ids } }, _count: { _all: true } }) : Promise.resolve(null),
      inPm && ids.length ? tx.manufacturerSite.findMany({ where: { partnerId: { in: ids } }, select: { partnerId: true, countryCode: true }, take: 5000 }) : Promise.resolve(null),
      rels.length ? tx.crmLocation.findMany({ where: { organizationId: user.organizationId, relationshipId: { in: rels }, archivedAt: null }, select: { relationshipId: true, countryCode: true, kind: true }, take: 5000 }) : Promise.resolve([]),
    ]);
    const cMap = new Map((contacts ?? []).map((c) => [c.partnerId, c._count._all]));
    for (const it of items) {
      const pid = it.partnerId;
      it.portfolio = pid && port ? port.get(pid) ?? null : null;
      it.contactCount = inPm ? (pid ? cMap.get(pid) ?? 0 : 0) : null;
      const mine = (sites ?? []).filter((x) => x.partnerId === pid);
      const own = places.filter((x) => x.relationshipId === it.id);
      it.siteCount = mine.length + own.length;
      it.siteCountries = [...new Set([...mine, ...own].map((x) => x.countryCode).filter((x): x is string => !!x))].sort();
    }
  }

  /**
   * Relationship filter on the kind of work done together. "None" means the stakeholder has never appeared on a live project; it is written as four
   * anti-joins on the indexed columns, because negating the big OR was too slow on thousands of stakeholders.
   */
  private workWhere(work: string): Prisma.CrmRelationshipWhereInput | null {
    if (work === "none") {
      const live = { archivedAt: null };
      return { partner: { projectsAsClient: { none: live }, projectsAsFreightForwarder: { none: live }, linesAsSupplier: { none: { archivedAt: null, project: live } }, linesAsManufacturer: { none: { archivedAt: null, project: live } } } };
    }
    const map: Record<string, string[]> = { in_progress: ["IN_PROGRESS"], submitted: ["SUBMITTED"], awarded: ["AWARDED"], completed: ["COMPLETED"], unawarded: ["UNAWARDED", "DECLINED"] };
    const st = map[work]; if (!st) return null;
    const pj = { status: { in: st }, archivedAt: null };
    return { partner: { OR: [
      { projectsAsClient: { some: pj } }, { projectsAsFreightForwarder: { some: pj } },
      { linesAsSupplier: { some: { archivedAt: null, project: pj } } }, { linesAsManufacturer: { some: { archivedAt: null, project: pj } } },
    ] } };
  }

  /** Relationship 360: contacts, work together, complaints, certificates, company checks and approval history, all read from the owning apps' tables. */
  async detail(user: RequestUser, id: string): Promise<CrmRelationshipDetail> {
    assertHasPermission(user, "crm.view");
    const staff = user.platformStaffRole !== "NONE";
    const inPm = staff || canUseApp(user.apps, "project-management");
    const seeContacts = inPm;
    const seeProjects = inPm && (staff || user.permissions.includes("projects.view"));
    const seeComplaints = this.canSeeComplaints(user);
    return withTenantContext(user.organizationId, async (tx) => {
      const r = await tx.crmRelationship.findFirst({ where: { id, organizationId: user.organizationId }, select: { partnerId: true } });
      if (!r) throw new NotFoundException("Relationship not found.");
      const pid = r.partnerId;
      const org = user.organizationId;
      if (!pid) return { portfolio: null, locations: [], links: [], partnerAddedAt: null, partnerUpdatedAt: null, contacts: null, projects: null, complaints: null, certificates: [], checks: [], approvals: [], approvalStatus: null, lastApprovalReviewDate: null, nextApprovalReviewDue: null };
      const projWhere: Prisma.ProjectWhereInput = { organizationId: org, archivedAt: null, OR: [{ clientId: pid }, { freightForwarderId: pid }, { lines: { some: { OR: [{ supplierId: pid }, { manufacturerId: pid }] } } }] };
      const [partner, contacts, projTotal, projs, compTotal, comps, certs, checks, approvals, portfolioMap, siteRows, ownLocations, ownLinks] = await Promise.all([
        tx.partner.findFirst({ where: { id: pid, organizationId: org }, select: { approvalStatus: true, lastApprovalReviewDate: true, nextApprovalReviewDue: true, website: true, createdAt: true, updatedAt: true } }),
        seeContacts ? tx.contact.findMany({ where: { organizationId: org, partnerId: pid }, orderBy: { name: "asc" }, take: 100, select: { id: true, name: true, title: true, email: true, phone: true } }) : Promise.resolve(null),
        seeProjects ? tx.project.count({ where: projWhere }) : Promise.resolve(0),
        seeProjects ? tx.project.findMany({ where: projWhere, orderBy: { createdAt: "desc" }, take: 25, select: { id: true, referenceNumber: true, title: true, status: true, dueDate: true, deliveryCountryCode: true, clientId: true, freightForwarderId: true, createdAt: true } }) : Promise.resolve([]),
        seeComplaints ? tx.qualityComplaint.count({ where: { organizationId: org, partnerId: pid, archivedAt: null } }) : Promise.resolve(0),
        seeComplaints ? tx.qualityComplaint.findMany({ where: { organizationId: org, partnerId: pid, archivedAt: null }, orderBy: { receivedAt: "desc" }, take: 25, select: { id: true, referenceNumber: true, title: true, status: true, severity: true, receivedAt: true } }) : Promise.resolve([]),
        tx.partnerCertification.findMany({ where: { organizationId: org, partnerId: pid }, orderBy: { expiryDate: "asc" }, take: 100, select: { id: true, type: true, referenceNumber: true, issuingBody: true, issuedDate: true, expiryDate: true, status: true } }),
        tx.partnerCompanyCheck.findMany({ where: { organizationId: org, partnerId: pid }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, checkType: true, customLabel: true, result: true, checkedDate: true } }),
        tx.partnerApprovalHistory.findMany({ where: { organizationId: org, partnerId: pid }, orderBy: { actionDate: "desc" }, take: 20, select: { id: true, action: true, reason: true, actionDate: true } }),
        seeProjects ? this.portfolioFor(tx, org, [pid]) : Promise.resolve(null),
        inPm ? tx.manufacturerSite.findMany({ where: { partnerId: pid }, orderBy: [{ isPrimary: "desc" }, { siteName: "asc" }], take: 100, select: { id: true, siteName: true, countryCode: true, address: true } }) : Promise.resolve([]),
        tx.crmLocation.findMany({ where: { organizationId: org, relationshipId: id, archivedAt: null }, orderBy: [{ name: "asc" }], take: 200 }),
        tx.crmLink.findMany({ where: { organizationId: org, relationshipId: id, archivedAt: null }, orderBy: [{ createdAt: "asc" }], take: 100 }),
      ]);
      // Which hat the stakeholder wore on each project: client and freight forwarder come from the header, supplier and manufacturer from the lines.
      const lineRoles = new Map<string, Set<string>>();
      if (projs.length) {
        const lines = await tx.projectLine.findMany({ where: { projectId: { in: projs.map((p) => p.id) }, OR: [{ supplierId: pid }, { manufacturerId: pid }] }, select: { projectId: true, supplierId: true, manufacturerId: true }, take: 5000 });
        for (const l of lines) { const set = lineRoles.get(l.projectId) ?? new Set<string>(); if (l.supplierId === pid) set.add("Supplier"); if (l.manufacturerId === pid) set.add("Manufacturer"); lineRoles.set(l.projectId, set); }
      }
      const iso = (d: Date | null) => d?.toISOString() ?? null;
      return {
        portfolio: portfolioMap?.get(pid) ?? null,
        locations: [
          ...ownLocations.map((l): CrmLocation => ({ id: l.id, source: "crm", kind: l.kind as CrmLocation["kind"], name: l.name, countryCode: l.countryCode, city: l.city, address: l.address, phone: l.phone, email: l.email, notes: l.notes })),
          ...siteRows.map((x): CrmLocation => ({ id: x.id, source: "pm", kind: "FACTORY", name: x.siteName, countryCode: x.countryCode, city: null, address: x.address, phone: null, email: null, notes: null })),
        ].sort((a, b) => (a.kind === "HQ" ? 0 : 1) - (b.kind === "HQ" ? 0 : 1) || a.name.localeCompare(b.name)),
        links: [
          ...(safeUrl(partner?.website) ? [{ id: "website", source: "pm" as const, kind: "WEBSITE" as const, label: "Website", url: safeUrl(partner?.website)! }] : []),
          ...ownLinks.map((l): CrmLink => ({ id: l.id, source: "crm", kind: l.kind as CrmLink["kind"], label: l.label, url: l.url })),
        ],
        partnerAddedAt: iso(partner?.createdAt ?? null), partnerUpdatedAt: iso(partner?.updatedAt ?? null),
        contacts,
        projects: seeProjects ? { total: projTotal, items: projs.map((p) => ({ id: p.id, referenceNumber: p.referenceNumber, title: p.title, status: p.status, dueDate: iso(p.dueDate), deliveryCountryCode: p.deliveryCountryCode, createdAt: p.createdAt.toISOString(), involvement: [...(p.clientId === pid ? ["Client"] : []), ...(p.freightForwarderId === pid ? ["Freight forwarder"] : []), ...(lineRoles.get(p.id) ?? [])] })) } : null,
        complaints: seeComplaints ? { total: compTotal, items: comps.map((c) => ({ id: c.id, referenceNumber: c.referenceNumber, title: c.title, status: c.status, severity: c.severity, receivedAt: c.receivedAt.toISOString() })) } : null,
        certificates: certs.map((c) => ({ ...c, issuedDate: iso(c.issuedDate), expiryDate: iso(c.expiryDate) })),
        checks: checks.map((c) => ({ ...c, checkedDate: iso(c.checkedDate) })),
        approvals: approvals.map((a) => ({ ...a, actionDate: a.actionDate.toISOString() })),
        approvalStatus: partner?.approvalStatus ?? null, lastApprovalReviewDate: iso(partner?.lastApprovalReviewDate ?? null), nextApprovalReviewDue: iso(partner?.nextApprovalReviewDue ?? null),
      };
    });
  }

  /** One page of a stakeholder's projects for the 360 Work tab: filtered by status bucket, by the part they played, and by a search word, all in the database. */
  async projectsPage(user: RequestUser, id: string, q: { bucket?: string; part?: string; q?: string; page?: number; pageSize?: number }): Promise<CrmProjectPage> {
    assertHasPermission(user, "crm.view");
    const staff = user.platformStaffRole !== "NONE";
    if (!(staff || (canUseApp(user.apps, "project-management") && user.permissions.includes("projects.view")))) throw new ForbiddenException("You do not have access to project data.");
    const pageSize = Math.min(Math.max(Math.trunc(q.pageSize ?? 10), 1), 50);
    const page = Math.max(Math.trunc(q.page ?? 1), 1);
    const statuses: Record<string, string[]> = { identified: ["IDENTIFIED"], inProgress: ["IN_PROGRESS"], submitted: ["SUBMITTED"], awarded: ["AWARDED"], completed: ["COMPLETED"], unawarded: ["UNAWARDED", "DECLINED"] };
    if (q.bucket && !statuses[q.bucket]) throw new BadRequestException("Choose a work bucket from the list.");
    if (q.part && !(CRM_PROJECT_PARTS as readonly string[]).includes(q.part)) throw new BadRequestException("Choose a part from the list.");
    return withTenantContext(user.organizationId, async (tx) => {
      const org = user.organizationId;
      const r = await tx.crmRelationship.findFirst({ where: { id, organizationId: org }, select: { partnerId: true } });
      if (!r) throw new NotFoundException("Relationship not found.");
      const pid = r.partnerId;
      if (!pid) return { items: [], total: 0, page, pageSize, counts: null };
      const partOr: Prisma.ProjectWhereInput[] = !q.part
        ? [{ clientId: pid }, { freightForwarderId: pid }, { lines: { some: { OR: [{ supplierId: pid }, { manufacturerId: pid }] } } }]
        : q.part === "client" ? [{ clientId: pid }]
        : q.part === "freight_forwarder" ? [{ freightForwarderId: pid }]
        : q.part === "supplier" ? [{ lines: { some: { supplierId: pid } } }]
        : [{ lines: { some: { manufacturerId: pid } } }];
      const needle = q.q?.trim().slice(0, 100);
      const where: Prisma.ProjectWhereInput = {
        organizationId: org, archivedAt: null, OR: partOr,
        ...(q.bucket ? { status: { in: statuses[q.bucket] as never } } : {}),
        ...(needle ? { AND: [{ OR: [{ title: { contains: needle } }, { referenceNumber: { contains: needle } }] }] } : {}),
      };
      const [total, rows, counts] = await Promise.all([
        tx.project.count({ where }),
        tx.project.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, referenceNumber: true, title: true, status: true, dueDate: true, deliveryCountryCode: true, clientId: true, freightForwarderId: true, createdAt: true } }),
        this.portfolioFor(tx, org, [pid]),
      ]);
      const lineRoles = new Map<string, Set<string>>();
      if (rows.length) {
        const lines = await tx.projectLine.findMany({ where: { projectId: { in: rows.map((p) => p.id) }, OR: [{ supplierId: pid }, { manufacturerId: pid }] }, select: { projectId: true, supplierId: true, manufacturerId: true }, take: 5000 });
        for (const l of lines) { const set = lineRoles.get(l.projectId) ?? new Set<string>(); if (l.supplierId === pid) set.add("Supplier"); if (l.manufacturerId === pid) set.add("Manufacturer"); lineRoles.set(l.projectId, set); }
      }
      return {
        total, page, pageSize, counts: counts.get(pid) ?? null,
        items: rows.map((p) => ({ id: p.id, referenceNumber: p.referenceNumber, title: p.title, status: p.status, dueDate: p.dueDate?.toISOString() ?? null, deliveryCountryCode: p.deliveryCountryCode, createdAt: p.createdAt.toISOString(), involvement: [...(p.clientId === pid ? ["Client"] : []), ...(p.freightForwarderId === pid ? ["Freight forwarder"] : []), ...(lineRoles.get(p.id) ?? [])] })),
      };
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
      // A review that has been done (or a relationship that has ended or been archived) no longer needs its reminder.
      if (dto.markReviewed || dto.status === "ENDED" || dto.archived) await completeActionsFor(tx, user.organizationId, "CrmRelationshipReview", id);
      await recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "crm_relationships", recordId: id, changedById: user.id, reason: dto.healthOverrideReason ?? null,
        changes: diffForAudit(cur, data, ["tier", "status", "ownerUserId", "summary", "reviewIntervalMonths", "lastReviewedAt", "nextReviewDue", "healthOverride", "healthOverrideReason", "archivedAt"]) });
      for (const k of [...this.overviewCache.keys()]) if (k.startsWith(`${user.organizationId}:`)) this.overviewCache.delete(k);
    });
    return this.one(user, id);
  }
}
