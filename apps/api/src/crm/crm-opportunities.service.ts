import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { syncOpportunity, syncOrganisationOpportunities, withTenantContext } from "@universe/db";
import type { Prisma } from "@universe/db";
import { COMMODITY_GROUPS, CRM_OPEN_STAGES, CRM_OPPORTUNITY_KINDS, CRM_OPPORTUNITY_STAGES, type CrmAttentionItem, type CrmOpportunity, type CrmOpportunityInput, type CrmOpportunityKind, type CrmOpportunityPage, type CrmOpportunityParticipant, type CrmOpportunityParticipantInput, type CrmOpportunitySyncResult, type CrmParticipantRole, type CrmTenderOption, CRM_PARTICIPANT_ROLES, type CrmOpportunityStage, type CrmPipelineView, type CrmPipelineSummary } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
import { assertHasPermission } from "../common/authorization";
import { completeActionsFor } from "../notifications/notify";
import { ExchangeRatesService } from "../exchange-rates/exchange-rates.service";
import { convertAmount } from "../tenders/tender-framework";
import { WinModel, reachedStages, type WinEstimate } from "./crm-win-probability";

/** Open opportunities with no stage movement for this long are flagged as stale. */
export const STALE_DAYS = 60;
const STAGE_RANK: Record<string, number> = { IDENTIFIED: 0, QUALIFYING: 1, ENGAGED: 2, SUBMITTED: 3, WON: 4 };
interface EventRow { opportunityId: string; eventType: string; toStage: string | null; oldValue: Prisma.Decimal | null; newValue: Prisma.Decimal | null; oldDate: Date | null; newDate: Date | null; occurredAt: Date }

type Row = Prisma.CrmOpportunityGetPayload<{ include: { relationship: { select: { partner: { select: { name: true } } } } } }>;
const AUDITED = ["title", "kind", "stage", "expectedValue", "currency", "expectedDate", "ownerUserId", "notes", "lostReason", "linkedId", "commodityGroup", "archivedAt"] as const;

/**
 * Opportunities: things that could become work with a stakeholder (a tender to bid on, something to source, a framework call-off, a supplier to qualify).
 * Private to the organisation. Values are cost-side figures only, never a price carrying a margin. Nothing is deleted (archive); every change is audited.
 */
@Injectable()
export class CrmOpportunitiesService {
  constructor(@Optional() private readonly fx?: ExchangeRatesService) {}

  private shape(r: Row, owners: Map<string, string>, est: WinEstimate | null = null, participants: CrmOpportunityParticipant[] = []): CrmOpportunity {
    const open = CRM_OPEN_STAGES.includes(r.stage as CrmOpportunityStage);
    return {
      id: r.id, relationshipId: r.relationshipId, relationshipName: r.relationship.partner?.name ?? "Unknown", title: r.title, kind: r.kind as CrmOpportunityKind, stage: r.stage as CrmOpportunityStage,
      stageChangedAt: r.stageChangedAt.toISOString(), expectedValue: r.expectedValue === null ? null : Number(r.expectedValue), currency: r.currency, expectedDate: r.expectedDate?.toISOString() ?? null,
      ownerUserId: r.ownerUserId, ownerName: r.ownerUserId ? owners.get(r.ownerUserId) ?? null : null, notes: r.notes, lostReason: r.lostReason,
      linkedType: r.linkedType, linkedId: r.linkedId, linkedLabel: r.linkedLabel, createdAt: r.createdAt.toISOString(), overdue: open && !!r.expectedDate && r.expectedDate.getTime() < Date.now(),
      commodityGroup: r.commodityGroup, sourceTenderId: r.sourceTenderId, sourceTenderLabel: r.sourceTenderLabel, syncWithLinked: r.syncWithLinked, participants, probability: open && est ? est.probability : null, winBasis: open && est ? est.basis : null,
    };
  }
  private static readonly include = { relationship: { select: { partner: { select: { name: true } } } } } as const;

  private async owners(tx: Prisma.TransactionClient, org: string, ids: (string | null)[]) {
    const uniq = [...new Set(ids.filter((x): x is string => !!x))];
    const us = uniq.length ? await tx.user.findMany({ where: { id: { in: uniq }, organizationId: org }, select: { id: true, forename: true, surname: true } }) : [];
    return new Map(us.map((u) => [u.id, `${u.forename} ${u.surname}`.trim()]));
  }


  /** The organisation's own closed history as a win-probability model, plus every stage event keyed by opportunity. One pass, reused by lists and the pipeline view. */
  private async history(tx: Prisma.TransactionClient, org: string) {
    const [closed, events] = await Promise.all([
      tx.crmOpportunity.findMany({ where: { organizationId: org, archivedAt: null, stage: { in: ["WON", "LOST"] } }, select: { id: true, stage: true, kind: true, commodityGroup: true, relationshipId: true }, take: 50000 }),
      tx.crmOpportunityEvent.findMany({ where: { organizationId: org }, orderBy: { occurredAt: "asc" }, take: 300000,
        select: { opportunityId: true, eventType: true, toStage: true, oldValue: true, newValue: true, oldDate: true, newDate: true, occurredAt: true } }),
    ]);
    const byOpp = new Map<string, EventRow[]>();
    for (const e of events) { const a = byOpp.get(e.opportunityId); if (a) a.push(e); else byOpp.set(e.opportunityId, [e]); }
    const model = new WinModel(closed.map((c) => ({ outcome: c.stage as "WON" | "LOST", kind: c.kind, commodityGroup: c.commodityGroup, relationshipId: c.relationshipId, reached: reachedStages((byOpp.get(c.id) ?? []).filter((e) => e.eventType !== "REVISION"), c.stage) })));
    return { model, byOpp };
  }

  private async logEvent(tx: Prisma.TransactionClient, org: string, opportunityId: string, userId: string, e: { eventType: "CREATED" | "STAGE" | "REVISION"; fromStage?: string | null; toStage?: string | null; oldValue?: number | null; newValue?: number | null; currency?: string | null; oldDate?: Date | null; newDate?: Date | null; reason?: string | null }) {
    await tx.crmOpportunityEvent.create({ data: { organizationId: org, opportunityId, changedById: userId, eventType: e.eventType, fromStage: e.fromStage ?? null, toStage: e.toStage ?? null, oldValue: e.oldValue ?? null, newValue: e.newValue ?? null, currency: e.currency ?? null, oldDate: e.oldDate ?? null, newDate: e.newDate ?? null, reason: e.reason?.slice(0, 500) ?? null } });
  }

  private async participantMap(tx: Prisma.TransactionClient, org: string, ids: string[]): Promise<Map<string, CrmOpportunityParticipant[]>> {
    const out = new Map<string, CrmOpportunityParticipant[]>();
    if (!ids.length) return out;
    const rows = await tx.crmOpportunityParticipant.findMany({ where: { organizationId: org, opportunityId: { in: ids }, archivedAt: null }, orderBy: { createdAt: "asc" },
      select: { id: true, opportunityId: true, relationshipId: true, role: true, source: true, note: true } });
    const rels = rows.length ? await tx.crmRelationship.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.relationshipId))] }, organizationId: org }, select: { id: true, partner: { select: { name: true, roles: { where: { isActive: true }, select: { roleType: true } } } } } }) : [];
    const by = new Map(rels.map((r) => [r.id, r]));
    for (const r of rows) {
      const rel = by.get(r.relationshipId); if (!rel) continue;
      const list = out.get(r.opportunityId) ?? [];
      list.push({ id: r.id, relationshipId: r.relationshipId, name: rel.partner?.name ?? "Stakeholder", kinds: (rel.partner?.roles ?? []).map((x) => x.roleType), role: r.role as CrmParticipantRole, source: r.source as "MANUAL" | "TENDER" | "PROJECT", note: r.note });
      out.set(r.opportunityId, list);
    }
    return out;
  }

  /** Tenders this organisation may see (its own, and those visible to it), for linking to an opportunity. */
  async tenderOptions(u: RequestUser, q?: string): Promise<CrmTenderOption[]> {
    assertHasPermission(u, "crm.view");
    const needle = q?.trim();
    return withTenantContext(u.organizationId, async (tx) => {
      const rows = await tx.tender.findMany({ where: { status: { not: "DRAFT" }, ...(needle ? { OR: [{ title: { contains: needle } }, { referenceNumber: { contains: needle } }] } : {}) }, orderBy: { publishedAt: "desc" }, take: 25,
        select: { id: true, referenceNumber: true, title: true, status: true, closingAt: true, organization: { select: { name: true } } } });
      return rows.map((t) => ({ id: t.id, referenceNumber: t.referenceNumber, title: t.title, status: t.status, issuerName: t.organization.name, closingAt: t.closingAt?.toISOString() ?? null }));
    });
  }

  async addParticipant(u: RequestUser, id: string, dto: CrmOpportunityParticipantInput): Promise<CrmOpportunity> {
    assertHasPermission(u, "crm.manage");
    if (!dto.relationshipId || !dto.role || !CRM_PARTICIPANT_ROLES.includes(dto.role)) throw new BadRequestException("Choose a stakeholder and what they did.");
    return withTenantContext(u.organizationId, async (tx) => {
      const o = await tx.crmOpportunity.findFirst({ where: { id, organizationId: u.organizationId }, select: { id: true } }); if (!o) throw new NotFoundException("Opportunity not found.");
      const rel = await tx.crmRelationship.findFirst({ where: { id: dto.relationshipId, organizationId: u.organizationId, archivedAt: null }, select: { id: true } }); if (!rel) throw new BadRequestException("That stakeholder was not found.");
      await tx.crmOpportunityParticipant.upsert({ where: { opportunityId_relationshipId_role: { opportunityId: id, relationshipId: rel.id, role: dto.role! } },
        create: { organizationId: u.organizationId, opportunityId: id, relationshipId: rel.id, role: dto.role!, source: "MANUAL", note: dto.note?.trim().slice(0, 300) || null, createdById: u.id }, update: { archivedAt: null, source: "MANUAL", note: dto.note?.trim().slice(0, 300) || null } });
      await recordFieldChanges(tx, { organizationId: u.organizationId, tableName: "crm_opportunities", recordId: id, changedById: u.id, changes: [{ field: "participant added", oldValue: null, newValue: `${dto.role}: ${rel.id}` }] });
      return this.one(tx, u, id);
    });
  }

  async removeParticipant(u: RequestUser, id: string, participantId: string): Promise<CrmOpportunity> {
    assertHasPermission(u, "crm.manage");
    return withTenantContext(u.organizationId, async (tx) => {
      const p = await tx.crmOpportunityParticipant.findFirst({ where: { id: participantId, opportunityId: id, organizationId: u.organizationId } }); if (!p) throw new NotFoundException("Not found.");
      await tx.crmOpportunityParticipant.update({ where: { id: p.id }, data: { archivedAt: new Date() } });
      await recordFieldChanges(tx, { organizationId: u.organizationId, tableName: "crm_opportunities", recordId: id, changedById: u.id, changes: [{ field: "participant removed", oldValue: `${p.role}: ${p.relationshipId}`, newValue: null }] });
      return this.one(tx, u, id);
    });
  }

  /** Re-reads the linked tender and project: who is involved, and (where it follows the link) the stage. One opportunity, or all that have a link. */
  async sync(u: RequestUser, id?: string): Promise<CrmOpportunitySyncResult> {
    assertHasPermission(u, "crm.manage");
    return withTenantContext(u.organizationId, async (tx) => {
      if (id) { const o = await tx.crmOpportunity.findFirst({ where: { id, organizationId: u.organizationId }, select: { id: true } }); if (!o) throw new NotFoundException("Opportunity not found."); }
      return syncOrganisationOpportunities(tx, u.organizationId, u.id, id ? [id] : undefined);
    });
  }

  private async one(tx: Prisma.TransactionClient, u: RequestUser, id: string): Promise<CrmOpportunity> {
    const row = await tx.crmOpportunity.findFirstOrThrow({ where: { id, organizationId: u.organizationId }, include: CrmOpportunitiesService.include });
    const [owners, hist, parts] = await Promise.all([this.owners(tx, u.organizationId, [row.ownerUserId]), this.history(tx, u.organizationId), this.participantMap(tx, u.organizationId, [id])]);
    return this.shape(row, owners, hist.model.estimate({ stage: row.stage, kind: row.kind, commodityGroup: row.commodityGroup, relationshipId: row.relationshipId }), parts.get(id) ?? []);
  }

  async list(u: RequestUser, q: { relationshipId?: string; stage?: string; kind?: string; owner?: string; q?: string; open?: string; group?: string; attention?: string; involved?: string; page?: number; pageSize?: number }): Promise<CrmOpportunityPage> {
    assertHasPermission(u, "crm.view");
    const pageSize = Math.min(Math.max(q.pageSize ?? 25, 1), 100); const page = Math.max(q.page ?? 1, 1);
    return withTenantContext(u.organizationId, async (tx) => {
      const and: Prisma.CrmOpportunityWhereInput[] = [{ organizationId: u.organizationId, archivedAt: null }];
      if (q.relationshipId) and.push({ relationshipId: q.relationshipId });
      if (q.involved) and.push({ participants: { some: { relationshipId: q.involved, archivedAt: null } }, relationshipId: { not: q.involved } });
      if (q.stage) and.push({ stage: q.stage });
      if (q.open === "true") and.push({ stage: { in: [...CRM_OPEN_STAGES] } });
      if (q.kind) and.push({ kind: q.kind });
      if (q.owner === "me") and.push({ ownerUserId: u.id }); else if (q.owner === "none") and.push({ ownerUserId: null }); else if (q.owner) and.push({ ownerUserId: q.owner });
      if (q.group) and.push({ commodityGroup: q.group });
      if (q.attention === "stale") and.push({ stage: { in: [...CRM_OPEN_STAGES] }, stageChangedAt: { lt: new Date(Date.now() - STALE_DAYS * 86400000) } });
      if (q.attention === "overdue") and.push({ stage: { in: [...CRM_OPEN_STAGES] }, expectedDate: { lt: new Date() } });
      const needle = q.q?.trim();
      if (needle) and.push({ OR: [{ title: { contains: needle } }, { relationship: { partner: { name: { contains: needle } } } }] });
      const where: Prisma.CrmOpportunityWhereInput = { AND: and };
      const [total, rows] = await Promise.all([
        tx.crmOpportunity.count({ where }),
        tx.crmOpportunity.findMany({ where, include: CrmOpportunitiesService.include, orderBy: [{ expectedDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
      ]);
      const owners = await this.owners(tx, u.organizationId, rows.map((r) => r.ownerUserId));
      const { model } = await this.history(tx, u.organizationId);
      const parts = await this.participantMap(tx, u.organizationId, rows.map((r) => r.id));
      return { items: rows.map((r) => this.shape(r, owners, model.estimate({ stage: r.stage, kind: r.kind, commodityGroup: r.commodityGroup, relationshipId: r.relationshipId }), parts.get(r.id) ?? [])), total, page, pageSize };
    });
  }

  /** The pipeline converted into one currency (the one asked for, else the most used), for the charts. Rates are today's, from the platform's exchange-rate snapshot. */
  async pipelineView(u: RequestUser, wanted?: string, relationshipId?: string): Promise<CrmPipelineView> {
    assertHasPermission(u, "crm.view");
    const { rows, model, byOpp, leads } = await withTenantContext(u.organizationId, async (tx) => {
      const rows = await tx.crmOpportunity.findMany({
        where: { organizationId: u.organizationId, archivedAt: null, ...(relationshipId ? { relationshipId } : {}) }, take: 20000,
        select: { id: true, title: true, kind: true, commodityGroup: true, ownerUserId: true, linkedType: true, linkedId: true, stageChangedAt: true, lostReason: true, relationshipId: true, stage: true, expectedValue: true, currency: true, expectedDate: true, relationship: { select: { partner: { select: { name: true, roles: { where: { isActive: true }, select: { roleType: true } } } } } } },
      });
      const { model, byOpp } = await this.history(tx, u.organizationId);
      // Where nobody owns an opportunity but it is linked to a Project Management project, the project lead stands in as its owner.
      const projectIds = [...new Set(rows.filter((r) => !r.ownerUserId && r.linkedType === "PROJECT" && r.linkedId).map((r) => r.linkedId!))];
      const leadRows = projectIds.length ? await tx.projectLead.findMany({ where: { projectId: { in: projectIds }, removedAt: null }, select: { projectId: true, userId: true } }) : [];
      const leads = new Map<string, string>(); for (const l of leadRows) if (!leads.has(l.projectId)) leads.set(l.projectId, l.userId);
      const names = await this.owners(tx, u.organizationId, [...rows.map((r) => r.ownerUserId), ...leads.values()]);
      return { rows, model, byOpp, leads: { map: leads, names } };
    });
    const used = new Map<string, number>(); for (const r of rows) if (r.currency && r.expectedValue !== null) used.set(r.currency, (used.get(r.currency) ?? 0) + 1);
    const currency = /^[A-Z]{3}$/.test(wanted ?? "") ? wanted! : [...used].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "GBP";
    const snap = this.fx ? await this.fx.getSnapshotForDate(new Date()).catch(() => null) : null;
    const conv = (v: number | null, c: string | null): number | null => (v === null || !c ? 0 : convertAmount(v, c, currency, snap?.rates ?? null));
    const open = new Set<string>(CRM_OPEN_STAGES);
    const stages = CRM_OPPORTUNITY_STAGES.map((stage) => ({ stage, count: 0, value: 0, weighted: 0, unconverted: 0 }));
    const monthMap = new Map<string, { count: number; value: number; weighted: number }>();
    const overdue = { count: 0, value: 0 }, noDate = { count: 0, value: 0 };
    const kindMap = new Map<string, { count: number; value: number }>();
    const order = ["MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "WAREHOUSING", "TENDERING_PURCHASING_BODY", "PROCUREMENT_SERVICE_AGENT", "FUNDER_DONOR", "CLIENT", "LOGISTICS"];
    const today = new Date(); const startOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    let won = 0, lost = 0, weightedTotal = 0;
    const byRel = new Map<string, { name: string; kinds: string[]; openCount: number; openValue: number; wonValue: number; won: number; lost: number }>();
    const lostReasons = new Map<string, { reason: string; count: number; value: number }>();
    const kindOutcome = new Map<string, { won: number; lost: number }>();
    const withdrawn = { count: 0, value: 0 };
    const ownerMap = new Map<string, { userId: string | null; name: string; openCount: number; openValue: number; weightedValue: number; won: number; lost: number }>();
    const exposure = new Map<string, { count: number; original: number; converted: number }>();
    const attention: CrmAttentionItem[] = []; let staleCount = 0, overdueCount = 0;
    const nowMs = Date.now();
    for (const r of rows) {
      const st = stages.find((x) => x.stage === r.stage); if (!st) continue;
      const raw = r.expectedValue === null ? null : Number(r.expectedValue);
      const v = conv(raw, r.currency);
      st.count++; if (v === null) st.unconverted++; else st.value += v;
      const isOpen = open.has(r.stage);
      const est = isOpen ? model.estimate({ stage: r.stage, kind: r.kind, commodityGroup: r.commodityGroup, relationshipId: r.relationshipId }) : null;
      const w = (v ?? 0) * (est?.probability ?? 0);
      if (isOpen) { st.weighted += w; weightedTotal += w; }
      if (r.stage === "WON") won++; if (r.stage === "LOST") lost++;
      if (r.stage === "WON" || r.stage === "LOST") { const k = kindOutcome.get(r.kind) ?? { won: 0, lost: 0 }; if (r.stage === "WON") k.won++; else k.lost++; kindOutcome.set(r.kind, k); }
      if (r.stage === "LOST") { const text = r.lostReason?.trim() || "No reason recorded"; const key = text.toLowerCase().slice(0, 80); const x = lostReasons.get(key) ?? { reason: text, count: 0, value: 0 }; x.count++; x.value += v ?? 0; lostReasons.set(key, x); }
      if (r.stage === "WITHDRAWN") { withdrawn.count++; withdrawn.value += v ?? 0; }
      const rel = byRel.get(r.relationshipId) ?? { name: r.relationship.partner?.name ?? "Stakeholder", kinds: (r.relationship.partner?.roles ?? []).map((x) => x.roleType), openCount: 0, openValue: 0, wonValue: 0, won: 0, lost: 0 };
      if (isOpen) { rel.openCount++; rel.openValue += v ?? 0; } else if (r.stage === "WON") { rel.won++; rel.wonValue += v ?? 0; } else if (r.stage === "LOST") rel.lost++;
      byRel.set(r.relationshipId, rel);
      // Owner: the named owner, else the lead of the linked project, else nobody.
      const ownerId = r.ownerUserId ?? (r.linkedType === "PROJECT" && r.linkedId ? leads.map.get(r.linkedId) ?? null : null);
      if (isOpen || r.stage === "WON" || r.stage === "LOST") {
        const key = ownerId ?? "none"; const o = ownerMap.get(key) ?? { userId: ownerId, name: ownerId ? leads.names.get(ownerId) ?? "Former colleague" : "Unassigned", openCount: 0, openValue: 0, weightedValue: 0, won: 0, lost: 0 };
        if (isOpen) { o.openCount++; o.openValue += v ?? 0; o.weightedValue += w; } else if (r.stage === "WON") o.won++; else o.lost++;
        ownerMap.set(key, o);
      }
      if (!isOpen) continue;
      const daysInStage = Math.floor((nowMs - r.stageChangedAt.getTime()) / 86400000);
      const isStale = daysInStage > STALE_DAYS; const isOverdue = !!r.expectedDate && r.expectedDate.getTime() < nowMs;
      if (isStale) staleCount++; if (isOverdue) overdueCount++;
      if (isStale || isOverdue) attention.push({ id: r.id, title: r.title, relationshipId: r.relationshipId, relationshipName: r.relationship.partner?.name ?? "Stakeholder", stage: r.stage as CrmOpportunityStage, value: raw, currency: r.currency, daysInStage, expectedDate: r.expectedDate?.toISOString() ?? null, reason: isOverdue ? "OVERDUE" : "STALE" });
      if (r.currency && raw !== null) { const x = exposure.get(r.currency) ?? { count: 0, original: 0, converted: 0 }; x.count++; x.original += raw; x.converted += v ?? 0; exposure.set(r.currency, x); }
      const val = v ?? 0;
      if (!r.expectedDate) { noDate.count++; noDate.value += val; }
      else if (r.expectedDate < startOfMonth) { overdue.count++; overdue.value += val; }
      else { const k = r.expectedDate.toISOString().slice(0, 7); const m = monthMap.get(k) ?? { count: 0, value: 0, weighted: 0 }; m.count++; m.value += val; m.weighted += w; monthMap.set(k, m); }
      const roles = r.relationship.partner?.roles.map((x) => x.roleType) ?? [];
      const kind = order.find((o) => roles.includes(o)) ?? "OTHER";
      const k = kindMap.get(kind) ?? { count: 0, value: 0 }; k.count++; k.value += val; kindMap.set(kind, k);
    }
    // Stage flow and forecast accuracy from the history, for the opportunities in view only.
    const inView = new Set(rows.map((r) => r.id));
    const flow = (CRM_OPEN_STAGES as string[]).map((stage) => ({ stage: stage as CrmOpportunityStage, reached: 0, advanced: 0, days: [] as number[] }));
    let revisions = 0; const slips: number[] = []; const valuePct: number[] = [];
    for (const [oppId, evs] of byOpp) {
      if (!inView.has(oppId)) continue;
      const moves = evs.filter((e) => e.eventType !== "REVISION" && e.toStage);
      const best = Math.max(-1, ...moves.map((e) => STAGE_RANK[e.toStage!] ?? -1));
      for (const f of flow) {
        const rank = STAGE_RANK[f.stage]; const idx = moves.findIndex((e) => e.toStage === f.stage);
        if (idx < 0) continue;
        f.reached++; if (best > rank) f.advanced++;
        const next = moves[idx + 1]; if (next) f.days.push((next.occurredAt.getTime() - moves[idx].occurredAt.getTime()) / 86400000);
      }
      for (const e of evs) if (e.eventType === "REVISION") {
        revisions++;
        if (e.oldDate && e.newDate && e.newDate > e.oldDate) slips.push((e.newDate.getTime() - e.oldDate.getTime()) / 86400000);
        if (e.oldValue !== null && e.newValue !== null && Number(e.oldValue) > 0) valuePct.push(Math.abs(Number(e.newValue) - Number(e.oldValue)) / Number(e.oldValue) * 100);
      }
    }
    const avg = (a: number[]) => (a.length ? Math.round((a.reduce((n, x) => n + x, 0) / a.length) * 10) / 10 : null);
    // Twelve months from this one, so gaps show as gaps.
    const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(Date.UTC(startOfMonth.getUTCFullYear(), startOfMonth.getUTCMonth() + i, 1)); const key = d.toISOString().slice(0, 7); return { month: key, ...(monthMap.get(key) ?? { count: 0, value: 0, weighted: 0 }) }; });
    const later = [...monthMap].filter(([k]) => k > months[11].month).reduce((a, [, m]) => ({ count: a.count + m.count, value: a.value + m.value, weighted: a.weighted + m.weighted }), { count: 0, value: 0, weighted: 0 });
    if (later.count) months.push({ month: "later", ...later });
    const r2 = (n: number) => Math.round(n);
    const exposureTotal = [...exposure.values()].reduce((n, x) => n + x.converted, 0) || 1;
    const closedCount = model.closedCount;
    return {
      currency, currencies: [...new Set([...used.keys(), "GBP", "EUR", "USD", currency])].sort(), rateDate: snap?.date ? snap.date.toISOString().slice(0, 10) : null,
      stakeholders: relationshipId ? [] : [...byRel].map(([id, x]) => ({ relationshipId: id, name: x.name, kinds: x.kinds, openCount: x.openCount, openValue: r2(x.openValue), wonValue: r2(x.wonValue), winRate: x.won + x.lost ? Math.round((x.won / (x.won + x.lost)) * 100) : null })).filter((x) => x.openCount > 0 || x.wonValue > 0).sort((a, b) => b.openValue - a.openValue || b.wonValue - a.wonValue).slice(0, 12),
      stages: stages.map((s) => ({ ...s, value: r2(s.value), weighted: r2(s.weighted) })), months: months.map((m) => ({ ...m, value: r2(m.value), weighted: r2(m.weighted) })), overdue: { count: overdue.count, value: r2(overdue.value) }, noDate: { count: noDate.count, value: r2(noDate.value) },
      kinds: [...kindMap].map(([key, k]) => ({ key, count: k.count, value: r2(k.value) })).sort((a, b) => b.value - a.value),
      openValue: r2(stages.filter((s) => open.has(s.stage)).reduce((n, s) => n + s.value, 0)), wonValue: r2(stages.find((s) => s.stage === "WON")?.value ?? 0),
      winRate: won + lost ? Math.round((won / (won + lost)) * 100) : null,
      weightedValue: r2(weightedTotal),
      model: { closedCount, overallRate: closedCount ? Math.round(model.overallRate * 100) / 100 : null, confidence: closedCount < 10 ? "LOW" : closedCount < 40 ? "MEDIUM" : "HIGH" },
      lost: { reasons: [...lostReasons.values()].sort((a, b) => b.count - a.count || b.value - a.value).slice(0, 8).map((x) => ({ ...x, value: r2(x.value) })), byKind: [...kindOutcome].map(([key, x]) => ({ key, ...x })).sort((a, b) => b.won + b.lost - (a.won + a.lost)), withdrawn: { count: withdrawn.count, value: r2(withdrawn.value) } },
      attention: { staleDays: STALE_DAYS, staleCount, overdueCount, items: attention.sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 8) },
      owners: [...ownerMap.values()].map((o) => ({ ...o, openValue: r2(o.openValue), weightedValue: r2(o.weightedValue), winRate: o.won + o.lost ? Math.round((o.won / (o.won + o.lost)) * 100) : null })).sort((a, b) => b.openValue - a.openValue),
      exposure: [...exposure].map(([c, x]) => ({ currency: c, count: x.count, original: r2(x.original), converted: r2(x.converted), share: Math.round((x.converted / exposureTotal) * 100) })).sort((a, b) => b.converted - a.converted),
      flow: flow.map((f) => ({ stage: f.stage, reached: f.reached, advanced: f.advanced, avgDays: avg(f.days) })),
      accuracy: { revisions, dateSlips: slips.length, avgSlipDays: avg(slips), valueRevisedPct: avg(valuePct) },
    };
  }

  async pipeline(u: RequestUser): Promise<CrmPipelineSummary> {
    assertHasPermission(u, "crm.view");
    return withTenantContext(u.organizationId, async (tx) => {
      const base = { organizationId: u.organizationId, archivedAt: null };
      const [groups, soon] = await Promise.all([
        tx.crmOpportunity.groupBy({ by: ["stage", "currency"], where: base, _count: { _all: true }, _sum: { expectedValue: true } }),
        tx.crmOpportunity.count({ where: { ...base, stage: { in: [...CRM_OPEN_STAGES] }, expectedDate: { gte: new Date(), lte: new Date(Date.now() + 30 * 86400000) } } }),
      ]);
      const byStage = Object.fromEntries(CRM_OPPORTUNITY_STAGES.map((s) => [s, { count: 0, value: {} as Record<string, number> }])) as CrmPipelineSummary["byStage"];
      for (const g of groups) {
        const s = byStage[g.stage as CrmOpportunityStage]; if (!s) continue;
        s.count += g._count._all;
        if (g._sum.expectedValue !== null && g.currency) s.value[g.currency] = (s.value[g.currency] ?? 0) + Number(g._sum.expectedValue);
      }
      return { byStage, openCount: CRM_OPEN_STAGES.reduce((n, s) => n + byStage[s].count, 0), closingSoon: soon };
    });
  }

  /** The tender to link, if one was chosen: it must be one the organisation can see (the tender policy decides). null clears the link. */
  private async resolveTender(tx: Prisma.TransactionClient, dto: CrmOpportunityInput): Promise<{ id: string; label: string } | null | undefined> {
    if (dto.sourceTenderId === undefined) return undefined;
    if (!dto.sourceTenderId) return null;
    const t = await tx.tender.findFirst({ where: { id: dto.sourceTenderId }, select: { id: true, referenceNumber: true, title: true } });
    if (!t) throw new BadRequestException("That tender was not found, or you cannot see it.");
    return { id: t.id, label: `${t.referenceNumber} · ${t.title}`.slice(0, 300) };
  }

  private async validate(tx: Prisma.TransactionClient, u: RequestUser, dto: CrmOpportunityInput) {
    if (dto.kind !== undefined && !CRM_OPPORTUNITY_KINDS.includes(dto.kind)) throw new BadRequestException("Choose a kind from the list.");
    if (dto.stage !== undefined && !CRM_OPPORTUNITY_STAGES.includes(dto.stage)) throw new BadRequestException("Choose a stage from the list.");
    if (dto.title !== undefined && !dto.title.trim()) throw new BadRequestException("Give the opportunity a short title.");
    if (dto.expectedValue !== undefined && dto.expectedValue !== null && (!Number.isFinite(dto.expectedValue) || dto.expectedValue < 0 || dto.expectedValue > 1e12)) throw new BadRequestException("Enter a valid value.");
    if (dto.currency && !/^[A-Z]{3}$/.test(dto.currency)) throw new BadRequestException("Use a three-letter currency code, such as GBP.");
    if (dto.expectedValue !== undefined && dto.expectedValue !== null && !dto.currency) throw new BadRequestException("Choose the currency for the value.");
    if (dto.expectedDate !== undefined && dto.expectedDate !== null && isNaN(new Date(dto.expectedDate).getTime())) throw new BadRequestException("Enter a valid date.");
    if (dto.commodityGroup && !(COMMODITY_GROUPS as readonly string[]).includes(dto.commodityGroup)) throw new BadRequestException("Choose a commodity or service group from the list.");
    if (dto.ownerUserId) { const ok = await tx.user.findFirst({ where: { id: dto.ownerUserId, organizationId: u.organizationId, archivedAt: null }, select: { id: true } }); if (!ok) throw new BadRequestException("The owner must be someone in your organisation."); }
    if (dto.linkedProjectId) {
      const p = await tx.project.findFirst({ where: { id: dto.linkedProjectId, organizationId: u.organizationId }, select: { id: true, referenceNumber: true, title: true } }); if (!p) throw new BadRequestException("That project was not found.");
      // What the project is about, and who leads it, so the opportunity can inherit both when they are not set.
      const lines = await tx.projectLine.findMany({ where: { projectId: p.id, archivedAt: null }, select: { productCategory: true }, take: 500 });
      const tally = new Map<string, number>(); for (const l of lines) if (l.productCategory) tally.set(l.productCategory, (tally.get(l.productCategory) ?? 0) + 1);
      const lead = await tx.projectLead.findFirst({ where: { projectId: p.id, removedAt: null }, select: { userId: true } });
      return { type: "PROJECT", id: p.id, label: `${p.referenceNumber} · ${p.title}`.slice(0, 300), commodityGroup: [...tally].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null, leadUserId: lead?.userId ?? null };
    }
    return null;
  }

  async create(u: RequestUser, dto: CrmOpportunityInput): Promise<CrmOpportunity> {
    assertHasPermission(u, "crm.manage");
    const title = dto.title?.trim(); const kind = dto.kind;
    if (!dto.relationshipId || !title || !kind) throw new BadRequestException("A stakeholder, a title and a kind are needed.");
    if (dto.stage === "LOST" && !dto.lostReason?.trim()) throw new BadRequestException("Say why it was lost.");
    return withTenantContext(u.organizationId, async (tx) => {
      const rel = await tx.crmRelationship.findFirst({ where: { id: dto.relationshipId, organizationId: u.organizationId }, select: { id: true, archivedAt: true } });
      if (!rel) throw new NotFoundException("Relationship not found.");
      if (rel.archivedAt) throw new BadRequestException("This relationship is archived.");
      const linked = await this.validate(tx, u, dto);
      const tender = await this.resolveTender(tx, dto);
      const row = await tx.crmOpportunity.create({ include: CrmOpportunitiesService.include, data: {
        organizationId: u.organizationId, relationshipId: rel.id, title: title.slice(0, 200), kind, stage: dto.stage ?? "IDENTIFIED",
        expectedValue: dto.expectedValue ?? null, currency: dto.expectedValue != null ? dto.currency ?? null : null, expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        commodityGroup: dto.commodityGroup ?? linked?.commodityGroup ?? null, ownerUserId: dto.ownerUserId ?? linked?.leadUserId ?? null, notes: dto.notes?.trim().slice(0, 1000) || null, lostReason: dto.lostReason?.trim().slice(0, 500) || null,
        linkedType: linked?.type ?? null, linkedId: linked?.id ?? null, linkedLabel: linked?.label ?? null,
        sourceTenderId: tender?.id ?? null, sourceTenderLabel: tender?.label ?? null, syncWithLinked: !!dto.syncWithLinked && !!(linked || tender), createdById: u.id } });
      await recordFieldChanges(tx, { organizationId: u.organizationId, tableName: "crm_opportunities", recordId: row.id, changedById: u.id, changes: [{ field: "created", oldValue: null, newValue: `${row.kind}: ${row.title}` }] });
      await this.logEvent(tx, u.organizationId, row.id, u.id, { eventType: "CREATED", toStage: row.stage, newValue: row.expectedValue === null ? null : Number(row.expectedValue), currency: row.currency, newDate: row.expectedDate });
      if (linked || tender) await syncOpportunity(tx, { id: row.id, organizationId: row.organizationId, relationshipId: row.relationshipId, stage: row.stage, linkedType: row.linkedType, linkedId: row.linkedId, sourceTenderId: row.sourceTenderId, syncWithLinked: row.syncWithLinked, lostReason: row.lostReason }, u.id);
      return this.one(tx, u, row.id);
    });
  }

  async update(u: RequestUser, id: string, dto: CrmOpportunityInput): Promise<CrmOpportunity> {
    assertHasPermission(u, "crm.manage");
    return withTenantContext(u.organizationId, async (tx) => {
      const cur = await tx.crmOpportunity.findFirst({ where: { id, organizationId: u.organizationId } });
      if (!cur) throw new NotFoundException("Opportunity not found.");
      const linked = await this.validate(tx, u, dto);
      const tender = await this.resolveTender(tx, dto);
      const stage = dto.stage ?? cur.stage;
      const lostReason = dto.lostReason !== undefined ? dto.lostReason?.trim() || null : cur.lostReason;
      if (stage === "LOST" && !lostReason) throw new BadRequestException("Say why it was lost.");
      const data: Prisma.CrmOpportunityUncheckedUpdateInput = {};
      if (dto.title !== undefined) data.title = dto.title.trim().slice(0, 200);
      if (dto.kind !== undefined) data.kind = dto.kind;
      if (dto.stage !== undefined && dto.stage !== cur.stage) { data.stage = dto.stage; data.stageChangedAt = new Date(); }
      if (dto.expectedValue !== undefined) { data.expectedValue = dto.expectedValue; data.currency = dto.expectedValue === null ? null : dto.currency ?? cur.currency; }
      else if (dto.currency !== undefined) data.currency = dto.currency;
      if (dto.expectedDate !== undefined) data.expectedDate = dto.expectedDate ? new Date(dto.expectedDate) : null;
      if (dto.ownerUserId !== undefined) data.ownerUserId = dto.ownerUserId;
      if (dto.commodityGroup !== undefined) data.commodityGroup = dto.commodityGroup || null;
      if (dto.notes !== undefined) data.notes = dto.notes?.trim().slice(0, 1000) || null;
      if (dto.lostReason !== undefined || (dto.stage && dto.stage !== "LOST")) data.lostReason = stage === "LOST" ? lostReason?.slice(0, 500) ?? null : dto.lostReason !== undefined ? lostReason?.slice(0, 500) ?? null : null;
      if (dto.linkedProjectId !== undefined) {
        data.linkedType = linked?.type ?? null; data.linkedId = linked?.id ?? null; data.linkedLabel = linked?.label ?? null;
        if (linked && dto.commodityGroup === undefined && !cur.commodityGroup && linked.commodityGroup) data.commodityGroup = linked.commodityGroup;
        if (linked && dto.ownerUserId === undefined && !cur.ownerUserId && linked.leadUserId) data.ownerUserId = linked.leadUserId;
      }
      if (tender !== undefined) { data.sourceTenderId = tender?.id ?? null; data.sourceTenderLabel = tender?.label ?? null; }
      if (dto.syncWithLinked !== undefined) data.syncWithLinked = dto.syncWithLinked && !!((dto.linkedProjectId === undefined ? cur.linkedId : linked?.id) || (tender === undefined ? cur.sourceTenderId : tender?.id));
      if (dto.archived !== undefined) { data.archivedAt = dto.archived ? new Date() : null; data.archivedById = dto.archived ? u.id : null; }
      const row = await tx.crmOpportunity.update({ where: { id }, data, include: CrmOpportunitiesService.include });
      await recordFieldChanges(tx, { organizationId: u.organizationId, tableName: "crm_opportunities", recordId: id, changedById: u.id, reason: stage === "LOST" ? lostReason : null, changes: diffForAudit(cur, data, AUDITED) });
      if (dto.stage !== undefined && dto.stage !== cur.stage) await this.logEvent(tx, u.organizationId, id, u.id, { eventType: "STAGE", fromStage: cur.stage, toStage: dto.stage, reason: dto.stage === "LOST" ? lostReason : null });
      const oldV = cur.expectedValue === null ? null : Number(cur.expectedValue), newV = row.expectedValue === null ? null : Number(row.expectedValue);
      const dateChanged = (cur.expectedDate?.getTime() ?? null) !== (row.expectedDate?.getTime() ?? null);
      // A move, a new date or archiving answers any "past its date" or "has not moved" action about it.
      if ((dto.stage !== undefined && dto.stage !== cur.stage) || dateChanged || dto.archived) await completeActionsFor(tx, u.organizationId, "CrmOpportunity", id);
      if (oldV !== newV || dateChanged) await this.logEvent(tx, u.organizationId, id, u.id, { eventType: "REVISION", oldValue: oldV, newValue: newV, currency: row.currency, oldDate: cur.expectedDate, newDate: row.expectedDate });
      if (tender !== undefined || dto.linkedProjectId !== undefined || dto.syncWithLinked !== undefined) await syncOpportunity(tx, { id: row.id, organizationId: row.organizationId, relationshipId: row.relationshipId, stage: row.stage, linkedType: row.linkedType, linkedId: row.linkedId, sourceTenderId: row.sourceTenderId, syncWithLinked: row.syncWithLinked, lostReason: row.lostReason }, u.id);
      return this.one(tx, u, id);
    });
  }
}
