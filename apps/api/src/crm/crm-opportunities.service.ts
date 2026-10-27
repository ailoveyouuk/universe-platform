import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { Prisma } from "@universe/db";
import { CRM_OPEN_STAGES, CRM_OPPORTUNITY_KINDS, CRM_OPPORTUNITY_STAGES, type CrmOpportunity, type CrmOpportunityInput, type CrmOpportunityKind, type CrmOpportunityPage, type CrmOpportunityStage, type CrmPipelineView, type CrmPipelineSummary } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
import { assertHasPermission } from "../common/authorization";
import { ExchangeRatesService } from "../exchange-rates/exchange-rates.service";
import { convertAmount } from "../tenders/tender-framework";

type Row = Prisma.CrmOpportunityGetPayload<{ include: { relationship: { select: { partner: { select: { name: true } } } } } }>;
const AUDITED = ["title", "kind", "stage", "expectedValue", "currency", "expectedDate", "ownerUserId", "notes", "lostReason", "linkedId", "archivedAt"] as const;

/**
 * Opportunities: things that could become work with a stakeholder (a tender to bid on, something to source, a framework call-off, a supplier to qualify).
 * Private to the organisation. Values are cost-side figures only, never a price carrying a margin. Nothing is deleted (archive); every change is audited.
 */
@Injectable()
export class CrmOpportunitiesService {
  constructor(@Optional() private readonly fx?: ExchangeRatesService) {}

  private shape(r: Row, owners: Map<string, string>): CrmOpportunity {
    const open = CRM_OPEN_STAGES.includes(r.stage as CrmOpportunityStage);
    return {
      id: r.id, relationshipId: r.relationshipId, relationshipName: r.relationship.partner?.name ?? "Unknown", title: r.title, kind: r.kind as CrmOpportunityKind, stage: r.stage as CrmOpportunityStage,
      stageChangedAt: r.stageChangedAt.toISOString(), expectedValue: r.expectedValue === null ? null : Number(r.expectedValue), currency: r.currency, expectedDate: r.expectedDate?.toISOString() ?? null,
      ownerUserId: r.ownerUserId, ownerName: r.ownerUserId ? owners.get(r.ownerUserId) ?? null : null, notes: r.notes, lostReason: r.lostReason,
      linkedType: r.linkedType, linkedId: r.linkedId, linkedLabel: r.linkedLabel, createdAt: r.createdAt.toISOString(), overdue: open && !!r.expectedDate && r.expectedDate.getTime() < Date.now(),
    };
  }
  private static readonly include = { relationship: { select: { partner: { select: { name: true } } } } } as const;

  private async owners(tx: Prisma.TransactionClient, org: string, ids: (string | null)[]) {
    const uniq = [...new Set(ids.filter((x): x is string => !!x))];
    const us = uniq.length ? await tx.user.findMany({ where: { id: { in: uniq }, organizationId: org }, select: { id: true, forename: true, surname: true } }) : [];
    return new Map(us.map((u) => [u.id, `${u.forename} ${u.surname}`.trim()]));
  }

  async list(u: RequestUser, q: { relationshipId?: string; stage?: string; kind?: string; owner?: string; q?: string; open?: string; page?: number; pageSize?: number }): Promise<CrmOpportunityPage> {
    assertHasPermission(u, "crm.view");
    const pageSize = Math.min(Math.max(q.pageSize ?? 25, 1), 100); const page = Math.max(q.page ?? 1, 1);
    return withTenantContext(u.organizationId, async (tx) => {
      const and: Prisma.CrmOpportunityWhereInput[] = [{ organizationId: u.organizationId, archivedAt: null }];
      if (q.relationshipId) and.push({ relationshipId: q.relationshipId });
      if (q.stage) and.push({ stage: q.stage });
      if (q.open === "true") and.push({ stage: { in: [...CRM_OPEN_STAGES] } });
      if (q.kind) and.push({ kind: q.kind });
      if (q.owner === "me") and.push({ ownerUserId: u.id }); else if (q.owner === "none") and.push({ ownerUserId: null }); else if (q.owner) and.push({ ownerUserId: q.owner });
      const needle = q.q?.trim();
      if (needle) and.push({ OR: [{ title: { contains: needle } }, { relationship: { partner: { name: { contains: needle } } } }] });
      const where: Prisma.CrmOpportunityWhereInput = { AND: and };
      const [total, rows] = await Promise.all([
        tx.crmOpportunity.count({ where }),
        tx.crmOpportunity.findMany({ where, include: CrmOpportunitiesService.include, orderBy: [{ expectedDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
      ]);
      const owners = await this.owners(tx, u.organizationId, rows.map((r) => r.ownerUserId));
      return { items: rows.map((r) => this.shape(r, owners)), total, page, pageSize };
    });
  }

  /** The pipeline converted into one currency (the one asked for, else the most used), for the charts. Rates are today's, from the platform's exchange-rate snapshot. */
  async pipelineView(u: RequestUser, wanted?: string): Promise<CrmPipelineView> {
    assertHasPermission(u, "crm.view");
    const rows = await withTenantContext(u.organizationId, (tx) => tx.crmOpportunity.findMany({
      where: { organizationId: u.organizationId, archivedAt: null }, take: 20000,
      select: { stage: true, expectedValue: true, currency: true, expectedDate: true, relationship: { select: { partner: { select: { roles: { where: { isActive: true }, select: { roleType: true } } } } } } },
    }));
    const used = new Map<string, number>(); for (const r of rows) if (r.currency && r.expectedValue !== null) used.set(r.currency, (used.get(r.currency) ?? 0) + 1);
    const currency = /^[A-Z]{3}$/.test(wanted ?? "") ? wanted! : [...used].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "GBP";
    const snap = this.fx ? await this.fx.getSnapshotForDate(new Date()).catch(() => null) : null;
    const conv = (v: number | null, c: string | null): number | null => (v === null || !c ? 0 : convertAmount(v, c, currency, snap?.rates ?? null));
    const open = new Set<string>(CRM_OPEN_STAGES);
    const stages = CRM_OPPORTUNITY_STAGES.map((stage) => ({ stage, count: 0, value: 0, unconverted: 0 }));
    const monthMap = new Map<string, { count: number; value: number }>();
    const overdue = { count: 0, value: 0 }, noDate = { count: 0, value: 0 };
    const kindMap = new Map<string, { count: number; value: number }>();
    const order = ["MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "WAREHOUSING", "TENDERING_PURCHASING_BODY", "PROCUREMENT_SERVICE_AGENT", "FUNDER_DONOR", "CLIENT", "LOGISTICS"];
    const today = new Date(); const startOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    let won = 0, lost = 0;
    for (const r of rows) {
      const st = stages.find((x) => x.stage === r.stage); if (!st) continue;
      const v = conv(r.expectedValue === null ? null : Number(r.expectedValue), r.currency);
      st.count++; if (v === null) st.unconverted++; else st.value += v;
      if (r.stage === "WON") won++; if (r.stage === "LOST") lost++;
      if (!open.has(r.stage)) continue;
      const val = v ?? 0;
      if (!r.expectedDate) { noDate.count++; noDate.value += val; }
      else if (r.expectedDate < startOfMonth) { overdue.count++; overdue.value += val; }
      else { const k = r.expectedDate.toISOString().slice(0, 7); const m = monthMap.get(k) ?? { count: 0, value: 0 }; m.count++; m.value += val; monthMap.set(k, m); }
      const roles = r.relationship.partner?.roles.map((x) => x.roleType) ?? [];
      const kind = order.find((o) => roles.includes(o)) ?? "OTHER";
      const k = kindMap.get(kind) ?? { count: 0, value: 0 }; k.count++; k.value += val; kindMap.set(kind, k);
    }
    // Twelve months from this one, so gaps show as gaps.
    const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(Date.UTC(startOfMonth.getUTCFullYear(), startOfMonth.getUTCMonth() + i, 1)); const key = d.toISOString().slice(0, 7); return { month: key, ...(monthMap.get(key) ?? { count: 0, value: 0 }) }; });
    const later = [...monthMap].filter(([k]) => k > months[11].month).reduce((a, [, m]) => ({ count: a.count + m.count, value: a.value + m.value }), { count: 0, value: 0 });
    if (later.count) months.push({ month: "later", ...later });
    const r2 = (n: number) => Math.round(n);
    return {
      currency, currencies: [...new Set([...used.keys(), "GBP", "EUR", "USD", currency])].sort(), rateDate: snap?.date ? snap.date.toISOString().slice(0, 10) : null,
      stages: stages.map((s) => ({ ...s, value: r2(s.value) })), months: months.map((m) => ({ ...m, value: r2(m.value) })), overdue: { count: overdue.count, value: r2(overdue.value) }, noDate: { count: noDate.count, value: r2(noDate.value) },
      kinds: [...kindMap].map(([key, k]) => ({ key, count: k.count, value: r2(k.value) })).sort((a, b) => b.value - a.value),
      openValue: r2(stages.filter((s) => open.has(s.stage)).reduce((n, s) => n + s.value, 0)), wonValue: r2(stages.find((s) => s.stage === "WON")?.value ?? 0),
      winRate: won + lost ? Math.round((won / (won + lost)) * 100) : null,
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

  private async validate(tx: Prisma.TransactionClient, u: RequestUser, dto: CrmOpportunityInput) {
    if (dto.kind !== undefined && !CRM_OPPORTUNITY_KINDS.includes(dto.kind)) throw new BadRequestException("Choose a kind from the list.");
    if (dto.stage !== undefined && !CRM_OPPORTUNITY_STAGES.includes(dto.stage)) throw new BadRequestException("Choose a stage from the list.");
    if (dto.title !== undefined && !dto.title.trim()) throw new BadRequestException("Give the opportunity a short title.");
    if (dto.expectedValue !== undefined && dto.expectedValue !== null && (!Number.isFinite(dto.expectedValue) || dto.expectedValue < 0 || dto.expectedValue > 1e12)) throw new BadRequestException("Enter a valid value.");
    if (dto.currency && !/^[A-Z]{3}$/.test(dto.currency)) throw new BadRequestException("Use a three-letter currency code, such as GBP.");
    if (dto.expectedValue !== undefined && dto.expectedValue !== null && !dto.currency) throw new BadRequestException("Choose the currency for the value.");
    if (dto.expectedDate !== undefined && dto.expectedDate !== null && isNaN(new Date(dto.expectedDate).getTime())) throw new BadRequestException("Enter a valid date.");
    if (dto.ownerUserId) { const ok = await tx.user.findFirst({ where: { id: dto.ownerUserId, organizationId: u.organizationId, archivedAt: null }, select: { id: true } }); if (!ok) throw new BadRequestException("The owner must be someone in your organisation."); }
    if (dto.linkedProjectId) { const p = await tx.project.findFirst({ where: { id: dto.linkedProjectId, organizationId: u.organizationId }, select: { id: true, referenceNumber: true, title: true } }); if (!p) throw new BadRequestException("That project was not found."); return { type: "PROJECT", id: p.id, label: `${p.referenceNumber} · ${p.title}`.slice(0, 300) }; }
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
      const row = await tx.crmOpportunity.create({ include: CrmOpportunitiesService.include, data: {
        organizationId: u.organizationId, relationshipId: rel.id, title: title.slice(0, 200), kind, stage: dto.stage ?? "IDENTIFIED",
        expectedValue: dto.expectedValue ?? null, currency: dto.expectedValue != null ? dto.currency ?? null : null, expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        ownerUserId: dto.ownerUserId ?? null, notes: dto.notes?.trim().slice(0, 1000) || null, lostReason: dto.lostReason?.trim().slice(0, 500) || null,
        linkedType: linked?.type ?? null, linkedId: linked?.id ?? null, linkedLabel: linked?.label ?? null, createdById: u.id } });
      await recordFieldChanges(tx, { organizationId: u.organizationId, tableName: "crm_opportunities", recordId: row.id, changedById: u.id, changes: [{ field: "created", oldValue: null, newValue: `${row.kind}: ${row.title}` }] });
      return this.shape(row, await this.owners(tx, u.organizationId, [row.ownerUserId]));
    });
  }

  async update(u: RequestUser, id: string, dto: CrmOpportunityInput): Promise<CrmOpportunity> {
    assertHasPermission(u, "crm.manage");
    return withTenantContext(u.organizationId, async (tx) => {
      const cur = await tx.crmOpportunity.findFirst({ where: { id, organizationId: u.organizationId } });
      if (!cur) throw new NotFoundException("Opportunity not found.");
      const linked = await this.validate(tx, u, dto);
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
      if (dto.notes !== undefined) data.notes = dto.notes?.trim().slice(0, 1000) || null;
      if (dto.lostReason !== undefined || (dto.stage && dto.stage !== "LOST")) data.lostReason = stage === "LOST" ? lostReason?.slice(0, 500) ?? null : dto.lostReason !== undefined ? lostReason?.slice(0, 500) ?? null : null;
      if (dto.linkedProjectId !== undefined) { data.linkedType = linked?.type ?? null; data.linkedId = linked?.id ?? null; data.linkedLabel = linked?.label ?? null; }
      if (dto.archived !== undefined) { data.archivedAt = dto.archived ? new Date() : null; data.archivedById = dto.archived ? u.id : null; }
      const row = await tx.crmOpportunity.update({ where: { id }, data, include: CrmOpportunitiesService.include });
      await recordFieldChanges(tx, { organizationId: u.organizationId, tableName: "crm_opportunities", recordId: id, changedById: u.id, reason: stage === "LOST" ? lostReason : null, changes: diffForAudit(cur, data, AUDITED) });
      return this.shape(row, await this.owners(tx, u.organizationId, [row.ownerUserId]));
    });
  }
}
