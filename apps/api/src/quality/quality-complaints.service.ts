import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { Prisma } from "@universe/db";
import { COMPLAINT_CLOCKS } from "@universe/types";
import type { ComplaintActionRecord, ComplaintDashboard, ComplaintDetail, ComplaintListItem, PagedResult } from "@universe/types";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
import { tenantScope } from "../common/tenant-scoped";
import { completeActionsFor, createNotifications, usersWithPermission } from "../notifications/notify";
import { addWorkingDays } from "../tenders/evaluation";
import type {
  CloseComplaintDto, ComplaintNoteDto, CreateComplaintActionDto, CreateComplaintDto, EffectivenessDto, PartnerResponseDto, RaiseRiskDto,
  RegulatorDecisionDto, ResolveComplaintDto, SaveInvestigationDto, SourceReviewDto, TriageComplaintDto, UpdateComplaintActionDto, UpdateComplaintDto,
} from "./dto/complaint.dto";

const VIEW = "quality.complaints.view";
const LOG = "quality.complaints.log";
const INVESTIGATE = "quality.complaints.investigate";
const APPROVE = "quality.complaints.approve";

/** Statuses in which the complaint is still being worked. */
const ACTIVE = ["LOGGED", "ACKNOWLEDGED", "TRIAGED", "INVESTIGATING", "RESOLVED", "ON_HOLD"];
/** Fields whose changes are written to the field change log. */
const AUDITED = [
  "title", "description", "channel", "receivedAt", "partnerId", "contactId", "complainantName", "complainantEmail", "complainantPhone",
  "projectId", "projectLineId", "productBatchId", "productMasterId", "flagPatientSafety", "flagSuspectedFalsified", "flagTemperatureExcursion",
  "category", "severity", "ownerId", "investigatorId", "investigationScope", "rootCauseCategory", "rootCause", "findings", "impactSummary", "outcome",
  "partnerResponse", "remedyType", "remedyNotes", "responseSentAt", "responseSummary", "complainantReaction", "closureSummary", "lessonsLearned",
  "effectivenessCheckDueAt", "effectivenessNotes", "status",
] as const;

const COMPLAINT_INCLUDE = {
  partner: { select: { name: true } },
  contact: { select: { name: true } },
  project: { select: { title: true, referenceNumber: true } },
  productBatch: { select: { batchNumber: true } },
  productMaster: { select: { name: true } },
  actions: { orderBy: { dueDate: "asc" as const } },
} satisfies Prisma.QualityComplaintInclude;

type Row = Prisma.QualityComplaintGetPayload<{ include: typeof COMPLAINT_INCLUDE }>;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const nm = (u?: { forename: string; surname: string } | null) => (u ? `${u.forename} ${u.surname}` : null);
const has = (u: RequestUser, k: string) => u.platformStaffRole !== "NONE" || u.permissions.includes(k);
const trimOrNull = (s?: string | null) => (s === undefined ? undefined : s === null || s.trim() === "" ? null : s.trim());

/** The next deadline that has not been met, and the stage it belongs to. */
function nextDue(r: Pick<Row, "status" | "acknowledgeDueAt" | "acknowledgedAt" | "triageDueAt" | "triagedAt" | "resolveDueAt" | "resolvedAt" | "direction">) {
  if (["CLOSED", "WITHDRAWN", "ON_HOLD"].includes(r.status)) return { at: null as Date | null, label: null as string | null };
  if (r.direction === "INBOUND_CLIENT" && !r.acknowledgedAt && !r.triagedAt && r.acknowledgeDueAt) return { at: r.acknowledgeDueAt, label: "Acknowledge" };
  if (!r.triagedAt && r.triageDueAt) return { at: r.triageDueAt, label: "Triage" };
  if (!r.resolvedAt && r.resolveDueAt) return { at: r.resolveDueAt, label: "Resolve" };
  return { at: null, label: null };
}

function actionRecord(a: Row["actions"][number], owners: Map<string, string>, now: Date): ComplaintActionRecord {
  return {
    id: a.id, type: a.type, description: a.description, ownerId: a.ownerId, ownerName: owners.get(a.ownerId) ?? null, dueDate: a.dueDate.toISOString(),
    status: a.status, completedAt: iso(a.completedAt), completionNotes: a.completionNotes, overdue: a.status === "OPEN" && a.dueDate < now,
  };
}

@Injectable()
export class QualityComplaintsService {
  // ---- helpers ------------------------------------------------------------------------------------------------

  private async load(tx: Prisma.TransactionClient, user: RequestUser, id: string): Promise<Row> {
    const r = await tx.qualityComplaint.findFirst({ where: { id, archivedAt: null, ...tenantScope(user.organizationId) }, include: COMPLAINT_INCLUDE });
    if (!r) throw new NotFoundException("Complaint not found.");
    return r;
  }

  private async event(tx: Prisma.TransactionClient, user: RequestUser, complaintId: string, kind: string, summary: string, body?: string | null) {
    await tx.qualityComplaintEvent.create({
      data: { organizationId: user.organizationId, complaintId, kind, summary: summary.slice(0, 500), body: body ?? null, actorUserId: user.id },
    });
  }

  private async audit(tx: Prisma.TransactionClient, user: RequestUser, before: object, after: object, reason?: string | null) {
    const changes = diffForAudit(before, after, AUDITED);
    await recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "quality_complaints", recordId: (before as { id: string }).id, changedById: user.id, changes, reason });
  }

  /** Every foreign key supplied must belong to this organisation (or be shared catalogue data). */
  private async checkLinks(tx: Prisma.TransactionClient, user: RequestUser, d: Partial<UpdateComplaintDto>) {
    const org = tenantScope(user.organizationId);
    const bad = (what: string) => new BadRequestException(`That ${what} was not found in your organisation.`);
    if (d.partnerId && !(await tx.partner.findFirst({ where: { id: d.partnerId, ...org }, select: { id: true } }))) throw bad("stakeholder");
    if (d.contactId && !(await tx.contact.findFirst({ where: { id: d.contactId, ...org }, select: { id: true } }))) throw bad("contact");
    if (d.projectId && !(await tx.project.findFirst({ where: { id: d.projectId, ...org }, select: { id: true } }))) throw bad("project");
    if (d.projectLineId && !(await tx.projectLine.findFirst({ where: { id: d.projectLineId, ...org }, select: { id: true } }))) throw bad("project line");
    if (d.productBatchId && !(await tx.productBatch.findFirst({ where: { id: d.productBatchId, ...org }, select: { id: true } }))) throw bad("batch");
    if (d.productMasterId && !(await tx.productMaster.findUnique({ where: { id: d.productMasterId }, select: { id: true } }))) throw bad("product");
  }

  private async checkUser(tx: Prisma.TransactionClient, user: RequestUser, id?: string | null) {
    if (!id) return;
    if (!(await tx.user.findFirst({ where: { id, organizationId: user.organizationId, status: "ACTIVE" }, select: { id: true } }))) {
      throw new BadRequestException("That person is not an active user in your organisation.");
    }
  }

  private async nextReference(tx: Prisma.TransactionClient, user: RequestUser, year: number) {
    const prefix = `CMP-${year}-`;
    const last = await tx.qualityComplaint.findFirst({ where: { ...tenantScope(user.organizationId), referenceNumber: { startsWith: prefix } }, orderBy: { referenceNumber: "desc" }, select: { referenceNumber: true } });
    const n = last ? Number(last.referenceNumber.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(n).padStart(4, "0")}`;
  }

  private link(id: string) { return `/quality/complaints?id=${id}`; }

  private async toDetail(tx: Prisma.TransactionClient, user: RequestUser, r: Row): Promise<ComplaintDetail> {
    const now = new Date();
    const userIds = [...new Set([r.ownerId, r.investigatorId, r.loggedById, r.closedById, r.regulatorDecisionById, ...r.actions.map((a) => a.ownerId)].filter((x): x is string => !!x))];
    const users = userIds.length ? await tx.user.findMany({ where: { id: { in: userIds } }, select: { id: true, forename: true, surname: true } }) : [];
    const names = new Map(users.map((u) => [u.id, `${u.forename} ${u.surname}`]));
    const events = await tx.qualityComplaintEvent.findMany({ where: { complaintId: r.id, ...tenantScope(user.organizationId) }, orderBy: { createdAt: "asc" } });
    const actors = [...new Set(events.map((e) => e.actorUserId).filter((x): x is string => !!x && !names.has(x)))];
    if (actors.length) for (const u of await tx.user.findMany({ where: { id: { in: actors } }, select: { id: true, forename: true, surname: true } })) names.set(u.id, `${u.forename} ${u.surname}`);
    const risks = await tx.riskAssessment.findMany({ where: { subjectType: "COMPLAINT", subjectId: r.id, ...tenantScope(user.organizationId) }, select: { id: true, title: true, severity: true, status: true } });
    const seePersonal = has(user, VIEW);
    const list = this.toListItem(r, names);
    return {
      ...list,
      description: r.description, channel: r.channel, heldFromStatus: r.heldFromStatus, holdReason: r.holdReason,
      flagPatientSafety: r.flagPatientSafety, flagSuspectedFalsified: r.flagSuspectedFalsified, flagTemperatureExcursion: r.flagTemperatureExcursion,
      contactId: r.contactId, contactName: seePersonal ? r.contact?.name ?? null : null,
      complainantName: seePersonal ? r.complainantName : null, complainantEmail: seePersonal ? r.complainantEmail : null, complainantPhone: seePersonal ? r.complainantPhone : null,
      projectLineId: r.projectLineId, productBatchId: r.productBatchId, batchNumber: r.productBatch?.batchNumber ?? null,
      productMasterId: r.productMasterId, productName: r.productMaster?.name ?? null,
      ownerId: r.ownerId, investigatorId: r.investigatorId, investigatorName: names.get(r.investigatorId ?? "") ?? null, loggedByName: names.get(r.loggedById ?? "") ?? null,
      acknowledgeDueAt: iso(r.acknowledgeDueAt), acknowledgedAt: iso(r.acknowledgedAt), triageDueAt: iso(r.triageDueAt), triagedAt: iso(r.triagedAt),
      resolveDueAt: iso(r.resolveDueAt), resolvedAt: iso(r.resolvedAt), closedAt: iso(r.closedAt),
      investigationStartedAt: iso(r.investigationStartedAt), investigationCompletedAt: iso(r.investigationCompletedAt),
      investigationScope: r.investigationScope, rootCauseCategory: r.rootCauseCategory, rootCause: r.rootCause, findings: r.findings, impactSummary: r.impactSummary,
      partnerResponseDueAt: iso(r.partnerResponseDueAt), partnerRespondedAt: iso(r.partnerRespondedAt), partnerResponse: r.partnerResponse,
      remedyType: r.remedyType, remedyNotes: r.remedyNotes, responseSentAt: iso(r.responseSentAt), responseSummary: r.responseSummary, complainantReaction: r.complainantReaction,
      regulatorDecision: r.regulatorDecision, regulatorDecisionReason: r.regulatorDecisionReason, regulatorReference: r.regulatorReference,
      regulatorDecisionByName: names.get(r.regulatorDecisionById ?? "") ?? null, regulatorDecisionAt: iso(r.regulatorDecisionAt),
      closureSummary: r.closureSummary, lessonsLearned: r.lessonsLearned, effectivenessCheckDueAt: iso(r.effectivenessCheckDueAt),
      effectivenessCheckedAt: iso(r.effectivenessCheckedAt), effectivenessNotes: r.effectivenessNotes,
      closedByName: names.get(r.closedById ?? "") ?? null, closureOverrideReason: r.closureOverrideReason, reopenCount: r.reopenCount,
      events: events.map((e) => ({ id: e.id, kind: e.kind, summary: e.summary, body: e.body, actorName: names.get(e.actorUserId ?? "") ?? null, createdAt: e.createdAt.toISOString() })),
      actions: r.actions.map((a) => actionRecord(a, names, now)),
      risks,
      can: { edit: has(user, LOG) && !["CLOSED", "WITHDRAWN"].includes(r.status), investigate: has(user, INVESTIGATE), approve: has(user, APPROVE), seePersonal },
    };
  }

  private toListItem(r: Row, names: Map<string, string>): ComplaintListItem {
    const due = nextDue(r);
    const now = new Date();
    return {
      id: r.id, referenceNumber: r.referenceNumber, direction: r.direction, status: r.status, title: r.title, severity: r.severity, category: r.category,
      isSerious: r.isSerious, receivedAt: r.receivedAt.toISOString(), partnerId: r.partnerId, partnerName: r.partner?.name ?? null, projectId: r.projectId,
      projectLabel: r.project ? `${r.project.referenceNumber ?? ""} ${r.project.title}`.trim() : null, ownerName: names.get(r.ownerId ?? "") ?? null,
      outcome: r.outcome, nextDueAt: iso(due.at), nextDueLabel: due.label, overdue: !!due.at && due.at < now,
      openActions: r.actions.filter((a) => a.status === "OPEN").length,
    };
  }

  // ---- reading -------------------------------------------------------------------------------------------------

  async get(user: RequestUser, id: string): Promise<ComplaintDetail> {
    assertHasPermission(user, VIEW);
    return withTenantContext(user.organizationId, async (tx) => this.toDetail(tx, user, await this.load(tx, user, id)));
  }

  async listPage(
    user: RequestUser,
    opts: { q?: string; status?: string; direction?: string; severity?: string; category?: string; partnerId?: string; projectId?: string; overdue?: boolean; serious?: boolean; open?: boolean; triage?: boolean; actions?: boolean; page?: number; pageSize?: number },
  ): Promise<PagedResult<ComplaintListItem>> {
    assertHasPermission(user, VIEW);
    const pageSize = Math.min(Math.max(Math.floor(opts.pageSize ?? 25), 5), 100);
    const page = Math.max(Math.floor(opts.page ?? 1), 1);
    const term = opts.q?.trim();
    const now = new Date();
    const where: Prisma.QualityComplaintWhereInput = {
      ...tenantScope(user.organizationId), archivedAt: null,
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.open ? { status: { in: ACTIVE } } : {}),
      ...(opts.direction ? { direction: opts.direction } : {}),
      ...(opts.severity ? { severity: opts.severity } : {}),
      ...(opts.category ? { category: opts.category } : {}),
      ...(opts.partnerId ? { partnerId: opts.partnerId } : {}),
      ...(opts.projectId ? { projectId: opts.projectId } : {}),
      ...(opts.serious ? { isSerious: true, status: { in: ACTIVE } } : {}),
      ...(opts.triage ? { status: { in: ["LOGGED", "ACKNOWLEDGED"] } } : {}),
      ...(opts.actions ? { actions: { some: { status: "OPEN" } } } : {}),
      ...(opts.overdue
        ? { status: { in: ["LOGGED", "ACKNOWLEDGED", "TRIAGED", "INVESTIGATING", "RESOLVED"] }, OR: [
            { acknowledgedAt: null, triagedAt: null, direction: "INBOUND_CLIENT", acknowledgeDueAt: { lt: now } },
            { triagedAt: null, triageDueAt: { lt: now } },
            { resolvedAt: null, resolveDueAt: { lt: now } },
          ] }
        : {}),
      ...(term ? { AND: [{ OR: [{ referenceNumber: { contains: term } }, { title: { contains: term } }, { description: { contains: term } }, { partner: { name: { contains: term } } }, { productBatch: { batchNumber: { contains: term } } }] }] } : {}),
    };
    return withTenantContext(user.organizationId, async (tx) => {
      const [total, rows] = await Promise.all([
        tx.qualityComplaint.count({ where }),
        tx.qualityComplaint.findMany({ where, include: COMPLAINT_INCLUDE, orderBy: [{ isSerious: "desc" }, { receivedAt: "desc" }, { id: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
      ]);
      const ids = [...new Set(rows.map((r) => r.ownerId).filter((x): x is string => !!x))];
      const us = ids.length ? await tx.user.findMany({ where: { id: { in: ids } }, select: { id: true, forename: true, surname: true } }) : [];
      const names = new Map(us.map((u) => [u.id, `${u.forename} ${u.surname}`]));
      return { items: rows.map((r) => this.toListItem(r, names)), total, page, pageSize } as PagedResult<ComplaintListItem>;
    });
  }

  async dashboard(user: RequestUser): Promise<ComplaintDashboard> {
    assertHasPermission(user, VIEW);
    const org = tenantScope(user.organizationId);
    const now = new Date();
    const since = new Date(now.getTime() - 90 * 86400000);
    return withTenantContext(user.organizationId, async (tx) => {
      const base = { ...org, archivedAt: null };
      const open = { ...base, status: { in: ACTIVE } };
      const [openN, serious, awaitingAck, awaitingTriage, investigating, closed90, openActions, overdueActions, overdueRows, closedRows, cats, perPartner] = await Promise.all([
        tx.qualityComplaint.count({ where: open }),
        tx.qualityComplaint.count({ where: { ...open, isSerious: true } }),
        tx.qualityComplaint.count({ where: { ...base, status: "LOGGED", direction: "INBOUND_CLIENT" } }),
        tx.qualityComplaint.count({ where: { ...base, status: { in: ["LOGGED", "ACKNOWLEDGED"] } } }),
        tx.qualityComplaint.count({ where: { ...base, status: "INVESTIGATING" } }),
        tx.qualityComplaint.count({ where: { ...base, status: "CLOSED", closedAt: { gte: since } } }),
        tx.qualityComplaintAction.count({ where: { ...org, status: "OPEN" } }),
        tx.qualityComplaintAction.count({ where: { ...org, status: "OPEN", dueDate: { lt: now } } }),
        tx.qualityComplaint.count({ where: { ...base, status: { in: ["LOGGED", "ACKNOWLEDGED", "TRIAGED", "INVESTIGATING", "RESOLVED"] }, OR: [
          { acknowledgedAt: null, triagedAt: null, direction: "INBOUND_CLIENT", acknowledgeDueAt: { lt: now } }, { triagedAt: null, triageDueAt: { lt: now } }, { resolvedAt: null, resolveDueAt: { lt: now } } ] } }),
        tx.qualityComplaint.findMany({ where: { ...base, status: "CLOSED", closedAt: { gte: since } }, select: { receivedAt: true, closedAt: true }, take: 2000 }),
        tx.qualityComplaint.groupBy({ by: ["category"], where: { ...base, category: { not: null } }, _count: { _all: true } }),
        tx.qualityComplaint.groupBy({ by: ["partnerId", "outcome"], where: { ...base, partnerId: { not: null } }, _count: { _all: true } }),
      ]);
      const days = closedRows.filter((c) => c.closedAt).map((c) => (c.closedAt!.getTime() - c.receivedAt.getTime()) / 86400000);
      const byPartnerMap = new Map<string, { count: number; upheld: number }>();
      for (const g of perPartner) {
        const cur = byPartnerMap.get(g.partnerId!) ?? { count: 0, upheld: 0 };
        cur.count += g._count._all;
        if (g.outcome === "UPHELD" || g.outcome === "PARTLY_UPHELD") cur.upheld += g._count._all;
        byPartnerMap.set(g.partnerId!, cur);
      }
      const top = [...byPartnerMap].sort((a, b) => b[1].count - a[1].count).slice(0, 10);
      const ps = top.length ? await tx.partner.findMany({ where: { id: { in: top.map(([id]) => id) }, ...org }, select: { id: true, name: true } }) : [];
      const pn = new Map(ps.map((p) => [p.id, p.name]));
      return {
        open: openN, overdue: overdueRows, serious, awaitingAcknowledgement: awaitingAck, awaitingTriage, investigating, closedLast90Days: closed90,
        averageDaysToClose: days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : null, openActions, overdueActions,
        byCategory: cats.map((c) => ({ category: c.category!, count: c._count._all })).sort((a, b) => b.count - a.count),
        byPartner: top.map(([id, v]) => ({ partnerId: id, partnerName: pn.get(id) ?? "Unknown", count: v.count, upheld: v.upheld })),
      };
    });
  }

  // ---- logging and editing ---------------------------------------------------------------------------------------

  async create(user: RequestUser, dto: CreateComplaintDto): Promise<ComplaintDetail> {
    assertHasPermission(user, LOG);
    const received = dto.receivedAt ? new Date(dto.receivedAt) : new Date();
    if (received.getTime() > Date.now() + 5 * 60000) throw new BadRequestException("The received date cannot be in the future.");
    const serious = !!(dto.flagPatientSafety || dto.flagSuspectedFalsified || dto.flagTemperatureExcursion);
    return withTenantContext(user.organizationId, async (tx) => {
      await this.checkLinks(tx, user, dto);
      const ref = await this.nextReference(tx, user, received.getUTCFullYear());
      const created = await tx.qualityComplaint.create({
        data: {
          organizationId: user.organizationId, referenceNumber: ref, direction: dto.direction, status: "LOGGED",
          title: dto.title.trim(), description: dto.description.trim(), receivedAt: received, channel: dto.channel ?? null,
          category: dto.category ?? null, severity: serious ? "CRITICAL" : dto.severity ?? null, isSerious: serious,
          flagPatientSafety: !!dto.flagPatientSafety, flagSuspectedFalsified: !!dto.flagSuspectedFalsified, flagTemperatureExcursion: !!dto.flagTemperatureExcursion,
          partnerId: dto.partnerId ?? null, contactId: dto.contactId ?? null, complainantName: trimOrNull(dto.complainantName) ?? null,
          complainantEmail: trimOrNull(dto.complainantEmail) ?? null, complainantPhone: trimOrNull(dto.complainantPhone) ?? null,
          projectId: dto.projectId ?? null, projectLineId: dto.projectLineId ?? null, productBatchId: dto.productBatchId ?? null, productMasterId: dto.productMasterId ?? null,
          loggedById: user.id,
          acknowledgeDueAt: dto.direction === "INBOUND_CLIENT" ? addWorkingDays(received, COMPLAINT_CLOCKS.acknowledgeWorkingDays) : null,
          triageDueAt: addWorkingDays(received, serious ? COMPLAINT_CLOCKS.triageSeriousWorkingDays : COMPLAINT_CLOCKS.triageWorkingDays),
          partnerResponseDueAt: dto.direction === "OUTBOUND_SUPPLY_CHAIN" ? new Date(received.getTime() + COMPLAINT_CLOCKS.partnerResponseCalendarDays * 86400000) : null,
        },
        include: COMPLAINT_INCLUDE,
      });
      await this.event(tx, user, created.id, "STAGE", `Logged ${ref}${serious ? " — flagged serious" : ""}`);
      const leads = new Set([...(await usersWithPermission(tx, user.organizationId, INVESTIGATE)), ...(await usersWithPermission(tx, user.organizationId, APPROVE))]);
      await createNotifications(tx, [...leads].map((id) => ({
        organizationId: user.organizationId, recipientUserId: id, actorUserId: user.id,
        kind: serious ? "COMPLAINT_SERIOUS" : "COMPLAINT_LOGGED", category: "QUALITY",
        title: serious ? `SERIOUS complaint ${ref}: ${created.title}` : `New complaint ${ref}: ${created.title}`,
        body: serious ? "Possible patient harm, suspected falsified product or temperature excursion. Triage today; consider batch quarantine, recall and reporting to the MHRA." : "Needs acknowledgement and triage.",
        link: this.link(created.id), subjectType: "complaint", subjectId: created.id, requiresAction: true,
        dueDate: serious ? addWorkingDays(received, COMPLAINT_CLOCKS.triageSeriousWorkingDays) : created.triageDueAt,
      })));
      return this.toDetail(tx, user, created);
    });
  }

  async update(user: RequestUser, id: string, dto: UpdateComplaintDto): Promise<ComplaintDetail> {
    assertHasPermission(user, LOG);
    return withTenantContext(user.organizationId, async (tx) => {
      const r = await this.load(tx, user, id);
      if (["CLOSED", "WITHDRAWN"].includes(r.status)) throw new ConflictException("A closed or withdrawn complaint cannot be edited. Reopen it first.");
      await this.checkLinks(tx, user, dto);
      const data: Prisma.QualityComplaintUncheckedUpdateInput = {};
      for (const k of ["title", "description", "channel", "complainantName", "complainantEmail", "complainantPhone", "partnerId", "contactId", "projectId", "projectLineId", "productBatchId", "productMasterId", "flagPatientSafety", "flagSuspectedFalsified", "flagTemperatureExcursion"] as const) {
        if (dto[k] !== undefined) (data as Record<string, unknown>)[k] = typeof dto[k] === "string" ? trimOrNull(dto[k] as string) : dto[k];
      }
      if (dto.receivedAt) data.receivedAt = new Date(dto.receivedAt);
      const flags = {
        p: dto.flagPatientSafety ?? r.flagPatientSafety, f: dto.flagSuspectedFalsified ?? r.flagSuspectedFalsified, t: dto.flagTemperatureExcursion ?? r.flagTemperatureExcursion,
      };
      const serious = flags.p || flags.f || flags.t;
      const becameSerious = serious && !r.isSerious;
      if (serious !== r.isSerious) { data.isSerious = serious; if (serious) data.severity = "CRITICAL"; }
      await this.audit(tx, user, r, { ...data, ...(data.receivedAt ? { receivedAt: data.receivedAt } : {}) });
      const updated = await tx.qualityComplaint.update({ where: { id }, data, include: COMPLAINT_INCLUDE });
      await this.event(tx, user, id, "NOTE", "Details edited");
      if (becameSerious) {
        const leads = new Set([...(await usersWithPermission(tx, user.organizationId, INVESTIGATE)), ...(await usersWithPermission(tx, user.organizationId, APPROVE))]);
        await createNotifications(tx, [...leads].map((uid) => ({
          organizationId: user.organizationId, recipientUserId: uid, actorUserId: user.id, kind: "COMPLAINT_SERIOUS", category: "QUALITY",
          title: `Complaint ${r.referenceNumber} is now flagged SERIOUS`, body: "Triage today; consider batch quarantine, recall and reporting to the MHRA.",
          link: this.link(id), subjectType: "complaint", subjectId: id, requiresAction: true, dueDate: addWorkingDays(new Date(), COMPLAINT_CLOCKS.triageSeriousWorkingDays),
        })));
        await this.event(tx, user, id, "STAGE", "Flagged serious — fast-track");
      }
      return this.toDetail(tx, user, updated);
    });
  }

  // ---- stages ------------------------------------------------------------------------------------------------------

  private async transition(user: RequestUser, id: string, perm: string, fn: (tx: Prisma.TransactionClient, r: Row) => Promise<Prisma.QualityComplaintUncheckedUpdateInput & { _event: string; _body?: string | null; _reason?: string | null }>) {
    assertHasPermission(user, perm);
    return withTenantContext(user.organizationId, async (tx) => {
      const r = await this.load(tx, user, id);
      const { _event, _body, _reason, ...data } = await fn(tx, r);
      await this.audit(tx, user, r, data, _reason);
      const updated = await tx.qualityComplaint.update({ where: { id }, data, include: COMPLAINT_INCLUDE });
      await this.event(tx, user, id, "STAGE", _event, _body);
      return this.toDetail(tx, user, updated);
    });
  }

  acknowledge(user: RequestUser, id: string) {
    return this.transition(user, id, LOG, async (_tx, r) => {
      if (r.direction !== "INBOUND_CLIENT") throw new BadRequestException("Only client complaints are acknowledged to the complainant.");
      if (r.status !== "LOGGED") throw new ConflictException("This complaint has already been acknowledged.");
      return { status: "ACKNOWLEDGED", acknowledgedAt: new Date(), _event: "Acknowledged to the complainant" };
    });
  }

  triage(user: RequestUser, id: string, dto: TriageComplaintDto) {
    return this.transition(user, id, INVESTIGATE, async (tx, r) => {
      if (!["LOGGED", "ACKNOWLEDGED"].includes(r.status)) throw new ConflictException("This complaint has already been triaged.");
      await this.checkUser(tx, user, dto.ownerId);
      await this.checkUser(tx, user, dto.investigatorId);
      const p = dto.flagPatientSafety ?? r.flagPatientSafety, f = dto.flagSuspectedFalsified ?? r.flagSuspectedFalsified, t = dto.flagTemperatureExcursion ?? r.flagTemperatureExcursion;
      const serious = p || f || t || r.isSerious;
      const severity = serious ? "CRITICAL" : dto.severity;
      const now = new Date();
      const resolveDue = new Date(r.receivedAt.getTime() + (COMPLAINT_CLOCKS.resolveCalendarDays[severity] ?? 30) * 86400000);
      if (dto.ownerId !== r.ownerId || (dto.investigatorId && dto.investigatorId !== r.investigatorId)) {
        await createNotifications(tx, [dto.ownerId, ...(dto.investigatorId ? [dto.investigatorId] : [])].map((uid) => ({
          organizationId: user.organizationId, recipientUserId: uid, actorUserId: user.id, kind: "COMPLAINT_ASSIGNED", category: "QUALITY",
          title: `Complaint ${r.referenceNumber} assigned to you: ${r.title}`, body: `${severity} ${dto.category.toLowerCase().replace(/_/g, " ")} complaint.`,
          link: this.link(r.id), subjectType: "complaint", subjectId: r.id, requiresAction: true, dueDate: resolveDue,
        })));
      }
      await completeActionsFor(tx, user.organizationId, "complaint", r.id);
      return {
        status: "TRIAGED", triagedAt: now, category: dto.category, severity, isSerious: serious, ownerId: dto.ownerId, investigatorId: dto.investigatorId ?? r.investigatorId,
        flagPatientSafety: p, flagSuspectedFalsified: f, flagTemperatureExcursion: t, resolveDueAt: resolveDue,
        regulatorDecision: serious && !r.regulatorDecision ? "UNDER_CONSIDERATION" : r.regulatorDecision,
        _event: `Triaged: ${severity}, ${dto.category.replace(/_/g, " ").toLowerCase()}`,
      };
    });
  }

  saveInvestigation(user: RequestUser, id: string, dto: SaveInvestigationDto) {
    return this.transition(user, id, INVESTIGATE, async (tx, r) => {
      if (!["TRIAGED", "INVESTIGATING"].includes(r.status)) throw new ConflictException("Triage the complaint before investigating it.");
      await this.checkUser(tx, user, dto.investigatorId);
      const data: Prisma.QualityComplaintUncheckedUpdateInput = { status: "INVESTIGATING" };
      for (const k of ["investigationScope", "rootCauseCategory", "rootCause", "findings", "impactSummary", "outcome"] as const) {
        if (dto[k] !== undefined) (data as Record<string, unknown>)[k] = trimOrNull(dto[k]);
      }
      data.investigatorId = dto.investigatorId ?? r.investigatorId ?? user.id;
      if (!r.investigationStartedAt) data.investigationStartedAt = new Date();
      let label = "Investigation saved";
      if (dto.complete) {
        const merged = { ...r, ...data } as Record<string, unknown>;
        if (!merged.outcome || !merged.rootCauseCategory || !merged.findings) throw new BadRequestException("To complete the investigation, record the outcome, the root-cause category and the findings.");
        data.investigationCompletedAt = new Date();
        label = `Investigation completed: ${String(merged.outcome).replace(/_/g, " ").toLowerCase()}`;
      }
      return { ...data, _event: label };
    });
  }

  async recordPartnerResponse(user: RequestUser, id: string, dto: PartnerResponseDto) {
    return this.transition(user, id, INVESTIGATE, async (_tx, r) => {
      if (r.direction !== "OUTBOUND_SUPPLY_CHAIN") throw new BadRequestException("Only supply-chain complaints have a partner response.");
      if (["CLOSED", "WITHDRAWN"].includes(r.status)) throw new ConflictException("This complaint is closed.");
      return { partnerResponse: dto.partnerResponse.trim(), partnerRespondedAt: dto.respondedAt ? new Date(dto.respondedAt) : new Date(), status: r.status, _event: "Partner response recorded", _body: dto.partnerResponse };
    });
  }

  resolve(user: RequestUser, id: string, dto: ResolveComplaintDto) {
    return this.transition(user, id, INVESTIGATE, async (_tx, r) => {
      if (r.status !== "INVESTIGATING" || !r.investigationCompletedAt) throw new ConflictException("Complete the investigation before resolving the complaint.");
      return {
        status: "RESOLVED", resolvedAt: new Date(), remedyType: dto.remedyType, remedyNotes: trimOrNull(dto.remedyNotes), responseSentAt: dto.responseSentAt ? new Date(dto.responseSentAt) : r.responseSentAt,
        responseSummary: trimOrNull(dto.responseSummary), complainantReaction: dto.complainantReaction ?? null, _event: `Resolved: ${dto.remedyType.replace(/_/g, " ").toLowerCase()}`,
      };
    });
  }

  async recordRegulatorDecision(user: RequestUser, id: string, dto: RegulatorDecisionDto) {
    if (dto.decision === "REPORTED" && !dto.reference?.trim()) throw new BadRequestException("Record the reference the regulator gave when the report was made.");
    return this.transition(user, id, APPROVE, async (_tx, r) => {
      if (!r.isSerious) throw new BadRequestException("A regulator decision is only recorded for serious complaints.");
      if (["CLOSED", "WITHDRAWN"].includes(r.status)) throw new ConflictException("This complaint is closed.");
      return {
        regulatorDecision: dto.decision, regulatorDecisionReason: dto.reason.trim(), regulatorReference: trimOrNull(dto.reference) ?? null,
        regulatorDecisionById: user.id, regulatorDecisionAt: new Date(), status: r.status,
        _event: `Regulator reporting: ${dto.decision.replace(/_/g, " ").toLowerCase()}`, _body: dto.reason, _reason: dto.reason,
      };
    });
  }

  close(user: RequestUser, id: string, dto: CloseComplaintDto) {
    return this.transition(user, id, APPROVE, async (tx, r) => {
      if (r.status !== "RESOLVED") throw new ConflictException("Only a resolved complaint can be closed.");
      if (!r.outcome) throw new BadRequestException("Record the investigation outcome before closing.");
      const open = r.actions.filter((a) => a.status === "OPEN").length;
      if (open) throw new ConflictException(`${open} corrective or preventive action${open === 1 ? " is" : "s are"} still open.`);
      if (r.isSerious && (!r.regulatorDecision || r.regulatorDecision === "UNDER_CONSIDERATION")) throw new ConflictException("Record the decision on reporting to the regulator before closing a serious complaint.");
      const sameAsInvestigator = r.investigatorId === user.id;
      if (sameAsInvestigator && !dto.overrideReason?.trim()) throw new ForbiddenException("The person who investigated cannot also approve closure without a recorded reason.");
      await completeActionsFor(tx, user.organizationId, "complaint", r.id);
      return {
        status: "CLOSED", closedAt: new Date(), closedById: user.id, closureSummary: dto.closureSummary.trim(), lessonsLearned: trimOrNull(dto.lessonsLearned),
        effectivenessCheckDueAt: dto.effectivenessCheckDueAt ? new Date(dto.effectivenessCheckDueAt) : null,
        closureOverrideReason: sameAsInvestigator ? dto.overrideReason!.trim() : null,
        _event: `Closed${sameAsInvestigator ? " (approved by the investigator with a recorded reason)" : ""}`, _reason: sameAsInvestigator ? dto.overrideReason : null,
      };
    });
  }

  recordEffectiveness(user: RequestUser, id: string, dto: EffectivenessDto) {
    return this.transition(user, id, APPROVE, async (_tx, r) => {
      if (r.status !== "CLOSED") throw new ConflictException("The effectiveness check follows closure.");
      return { effectivenessCheckedAt: new Date(), effectivenessNotes: dto.effectivenessNotes.trim(), _event: "Effectiveness check recorded", _body: dto.effectivenessNotes };
    });
  }

  hold(user: RequestUser, id: string, reason: string) {
    return this.transition(user, id, INVESTIGATE, async (_tx, r) => {
      if (!["LOGGED", "ACKNOWLEDGED", "TRIAGED", "INVESTIGATING", "RESOLVED"].includes(r.status)) throw new ConflictException("This complaint cannot be put on hold.");
      return { status: "ON_HOLD", heldFromStatus: r.status, holdReason: reason.trim(), _event: "Put on hold", _body: reason, _reason: reason };
    });
  }

  resume(user: RequestUser, id: string) {
    return this.transition(user, id, INVESTIGATE, async (_tx, r) => {
      if (r.status !== "ON_HOLD") throw new ConflictException("This complaint is not on hold.");
      return { status: r.heldFromStatus ?? "INVESTIGATING", heldFromStatus: null, holdReason: null, _event: "Resumed" };
    });
  }

  withdraw(user: RequestUser, id: string, reason: string) {
    return this.transition(user, id, APPROVE, async (tx, r) => {
      if (["CLOSED", "WITHDRAWN"].includes(r.status)) throw new ConflictException("This complaint is already finished.");
      await completeActionsFor(tx, user.organizationId, "complaint", r.id);
      return { status: "WITHDRAWN", closedAt: new Date(), closedById: user.id, closureSummary: `Withdrawn: ${reason.trim()}`, _event: "Withdrawn", _body: reason, _reason: reason };
    });
  }

  reopen(user: RequestUser, id: string, reason: string) {
    return this.transition(user, id, APPROVE, async (_tx, r) => {
      if (!["CLOSED", "WITHDRAWN"].includes(r.status)) throw new ConflictException("Only a closed or withdrawn complaint can be reopened.");
      return {
        status: r.investigationStartedAt ? "INVESTIGATING" : r.triagedAt ? "TRIAGED" : "LOGGED", closedAt: null, closedById: null, closureOverrideReason: null,
        resolvedAt: null, investigationCompletedAt: null, reopenCount: r.reopenCount + 1, _event: `Reopened (${r.reopenCount + 1})`, _body: reason, _reason: reason,
      };
    });
  }

  // ---- notes and CAPA ------------------------------------------------------------------------------------------------

  async addNote(user: RequestUser, id: string, dto: ComplaintNoteDto): Promise<ComplaintDetail> {
    assertHasPermission(user, LOG);
    return withTenantContext(user.organizationId, async (tx) => {
      const r = await this.load(tx, user, id);
      await this.event(tx, user, id, dto.kind, dto.summary, dto.body);
      return this.toDetail(tx, user, r);
    });
  }

  async addAction(user: RequestUser, id: string, dto: CreateComplaintActionDto): Promise<ComplaintDetail> {
    assertHasPermission(user, INVESTIGATE);
    return withTenantContext(user.organizationId, async (tx) => {
      const r = await this.load(tx, user, id);
      if (["CLOSED", "WITHDRAWN"].includes(r.status)) throw new ConflictException("This complaint is closed.");
      await this.checkUser(tx, user, dto.ownerId);
      const due = new Date(dto.dueDate);
      const a = await tx.qualityComplaintAction.create({ data: { organizationId: user.organizationId, complaintId: id, type: dto.type, description: dto.description.trim(), ownerId: dto.ownerId, dueDate: due, createdById: user.id } });
      await this.event(tx, user, id, "STAGE", `${dto.type.toLowerCase()} action added`, dto.description);
      await createNotifications(tx, [{
        organizationId: user.organizationId, recipientUserId: dto.ownerId, actorUserId: user.id, kind: "COMPLAINT_ACTION", category: "QUALITY",
        title: `${dto.type === "CORRECTIVE" ? "Corrective" : dto.type === "PREVENTIVE" ? "Preventive" : "Containment"} action for ${r.referenceNumber}`,
        body: dto.description.slice(0, 300), link: this.link(id), subjectType: "complaint-action", subjectId: a.id, requiresAction: true, dueDate: due,
      }]);
      return this.toDetail(tx, user, await this.load(tx, user, id));
    });
  }

  async updateAction(user: RequestUser, id: string, actionId: string, dto: UpdateComplaintActionDto): Promise<ComplaintDetail> {
    assertHasPermission(user, LOG);
    return withTenantContext(user.organizationId, async (tx) => {
      const r = await this.load(tx, user, id);
      const a = r.actions.find((x) => x.id === actionId);
      if (!a) throw new NotFoundException("Action not found.");
      const isOwner = a.ownerId === user.id;
      const manage = has(user, INVESTIGATE);
      if (!isOwner && !manage) throw new ForbiddenException("Only the action's owner or an investigator can update it.");
      if ((dto.ownerId || dto.dueDate) && !manage) throw new ForbiddenException("Only an investigator can reassign or reschedule an action.");
      if (dto.ownerId) await this.checkUser(tx, user, dto.ownerId);
      const data: Prisma.QualityComplaintActionUncheckedUpdateInput = {};
      if (dto.ownerId) data.ownerId = dto.ownerId;
      if (dto.dueDate) data.dueDate = new Date(dto.dueDate);
      if (dto.completionNotes !== undefined) data.completionNotes = trimOrNull(dto.completionNotes);
      if (dto.status && dto.status !== a.status) {
        data.status = dto.status;
        data.completedAt = dto.status === "OPEN" ? null : new Date();
      }
      const updated = await tx.qualityComplaintAction.update({ where: { id: actionId }, data });
      const changes = diffForAudit(a, updated, ["ownerId", "dueDate", "status", "completionNotes"]);
      await recordFieldChanges(tx, { organizationId: user.organizationId, tableName: "quality_complaint_actions", recordId: actionId, changedById: user.id, changes });
      if (updated.status !== "OPEN") {
        await completeActionsFor(tx, user.organizationId, "complaint-action", actionId);
        await this.event(tx, user, id, "STAGE", `Action ${updated.status === "DONE" ? "completed" : "cancelled"}: ${a.description.slice(0, 80)}`, dto.completionNotes);
      } else if (dto.ownerId && dto.ownerId !== a.ownerId) {
        await createNotifications(tx, [{
          organizationId: user.organizationId, recipientUserId: dto.ownerId, actorUserId: user.id, kind: "COMPLAINT_ACTION", category: "QUALITY",
          title: `Action for ${r.referenceNumber} reassigned to you`, body: a.description.slice(0, 300), link: this.link(id), subjectType: "complaint-action", subjectId: actionId, requiresAction: true, dueDate: updated.dueDate,
        }]);
      }
      return this.toDetail(tx, user, await this.load(tx, user, id));
    });
  }

  // ---- links across the platform ------------------------------------------------------------------------------------

  /** Raises a risk-register entry against the complaint, using the shared risk register. */
  async raiseRisk(user: RequestUser, id: string, dto: RaiseRiskDto): Promise<ComplaintDetail> {
    assertHasPermission(user, INVESTIGATE);
    return withTenantContext(user.organizationId, async (tx) => {
      const r = await this.load(tx, user, id);
      await this.checkUser(tx, user, dto.ownerId);
      const risk = await tx.riskAssessment.create({
        data: {
          organizationId: user.organizationId, subjectType: "COMPLAINT", subjectId: id, title: (dto.title?.trim() || `Recurrence of: ${r.title}`).slice(0, 300),
          description: `Raised from complaint ${r.referenceNumber}. Root cause: ${r.rootCauseCategory ?? "not yet determined"}.`, severity: dto.severity, likelihood: dto.likelihood,
          mitigation: trimOrNull(dto.mitigation), ownerId: dto.ownerId ?? r.ownerId, createdById: user.id,
        },
      });
      await this.event(tx, user, id, "LINK", `Risk raised in the risk register: ${risk.title}`);
      if (risk.ownerId) {
        await createNotifications(tx, [{
          organizationId: user.organizationId, recipientUserId: risk.ownerId, actorUserId: user.id, kind: "RISK_ASSIGNED", category: "RISK",
          title: `Review risk: ${risk.title}`, body: `Raised from complaint ${r.referenceNumber}.`, link: "/risk-register", subjectType: "risk", subjectId: risk.id, requiresAction: true,
        }]);
      }
      return this.toDetail(tx, user, r);
    });
  }

  /**
   * An upheld complaint about a manufacturer or supplier can send the matching product source approval back for QA review.
   * REVERIFY brings the review date to today; SUSPEND also returns the approval to PENDING (needs products.approve).
   */
  async requestSourceReview(user: RequestUser, id: string, dto: SourceReviewDto): Promise<ComplaintDetail> {
    assertHasPermission(user, INVESTIGATE);
    if (dto.action === "SUSPEND") assertHasPermission(user, "products.approve");
    return withTenantContext(user.organizationId, async (tx) => {
      const r = await this.load(tx, user, id);
      if (!["UPHELD", "PARTLY_UPHELD"].includes(r.outcome ?? "")) throw new BadRequestException("A source review follows an upheld or partly upheld complaint.");
      if (!r.partnerId || !r.productMasterId) throw new BadRequestException("Link the complaint to the product and the manufacturer or supplier first.");
      const approvals = await tx.productSourceApproval.findMany({
        where: { ...tenantScope(user.organizationId), productMasterId: r.productMasterId, isArchived: false, OR: [{ manufacturerId: r.partnerId }, { supplierId: r.partnerId }] },
      });
      if (!approvals.length) throw new NotFoundException("No product source approval matches this product and stakeholder.");
      const stamp = `${new Date().toISOString().slice(0, 10)} complaint ${r.referenceNumber} ${dto.action === "SUSPEND" ? "— approval returned to pending" : "— re-verification requested"}${dto.note ? `: ${dto.note}` : ""}`;
      for (const a of approvals) {
        const data: Prisma.ProductSourceApprovalUncheckedUpdateInput = { nextReviewDue: new Date(), notes: a.notes ? `${a.notes}\n${stamp}` : stamp };
        if (dto.action === "SUSPEND" && a.status === "APPROVED") data.status = "PENDING";
        const upd = await tx.productSourceApproval.update({ where: { id: a.id }, data });
        await recordFieldChanges(tx, {
          organizationId: user.organizationId, tableName: "product_source_approvals", recordId: a.id, changedById: user.id,
          changes: diffForAudit(a, upd, ["status", "nextReviewDue"]), reason: `Complaint ${r.referenceNumber}`,
        });
      }
      await this.event(tx, user, id, "LINK", `Product source review requested (${dto.action === "SUSPEND" ? "approval returned to pending" : "re-verification"}) on ${approvals.length} approval${approvals.length === 1 ? "" : "s"}`, dto.note);
      const qa = await usersWithPermission(tx, user.organizationId, "products.approve", user.id);
      await createNotifications(tx, qa.map((uid) => ({
        organizationId: user.organizationId, recipientUserId: uid, actorUserId: user.id, kind: "SOURCE_REVIEW_REQUESTED", category: "QUALITY",
        title: `Review product source after complaint ${r.referenceNumber}`, body: stamp.slice(0, 300), link: "/quality", subjectType: "complaint", subjectId: id, requiresAction: true,
      })));
      return this.toDetail(tx, user, r);
    });
  }
}
