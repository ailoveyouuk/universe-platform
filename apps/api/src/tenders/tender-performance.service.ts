import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { withPlatformStaffContext, withTenantContext } from "@universe/db";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";
import { lineTimeliness } from "../quality/delivery-metrics";
import { loadSettings } from "../quality/scorecard-settings.service";
import { appendTenderEvent } from "./tender-events";
import { TendersService } from "./tenders.service";
import type { ContractPaymentDto, ContractPaymentUpdateDto, OwnerFeedbackDto, PerformanceAnswerDto, PerformanceResponseDto } from "./dto/tenders.dto";
import { REPLY_WINDOW_DAYS, buildMeasures, feedbackAverage, feedbackProblem, ownerPaymentPractice, supplierAggregate, type DeliveryFacts, type FeedbackInput, type QualityFacts, type MilestoneFacts, type ScoringConfig } from "./tender-performance";

type Tx = Parameters<Parameters<typeof withTenantContext>[1]>[0];
const DAY = 86_400_000;
const num = (v: unknown) => (v == null ? null : Number(v));

/** What the owner's close step needs: facts read from both parties' data, then frozen into the record. */
export interface ClosePrep { cfg: ScoringConfig & { earlyDays: number; lateDays: number }; milestones: MilestoneFacts; delivery: DeliveryFacts | null; quality: QualityFacts }

/**
 * Tender performance records (step 6, 2026-10-21). One frozen record per closed contract, shared by the owner and the supplier (database
 * policy plus the checks here). Other organisations only ever see the anonymised aggregate (at least 3 contracts from at least 2 owners)
 * and the owner's payment practice aggregate; neither carries identities, feedback text or per-contract numbers. Records are never edited:
 * the supplier replies or disputes within 14 days, the owner answers, and platform staff can withdraw a record for evident error or abuse.
 */
@Injectable()
export class TenderPerformanceService {
  constructor(private readonly tenders: TendersService) {}

  // ------------------------------------------------------------------ close-out (called from the contract close step)

  /** Reads the owner's scoring settings and the contract's milestones (owner session), then the supplier's delivery lines (staff read, facts only). */
  async prepare(tx: Tx, ownerOrgId: string, c: { id: string; supplierProjectId: string | null }, qualityChecked = false): Promise<ClosePrep> {
    const cfg = await loadSettings(tx, ownerOrgId);
    const ms = await tx.tenderContractMilestone.findMany({ where: { contractId: c.id } });
    const milestones: MilestoneFacts = { total: 0, pending: 0, done: 0, onTime: 0, late: 0, missed: 0 };
    for (const m of ms) {
      if (m.status !== "PENDING") milestones.total++;
      if (m.status === "DONE") {
        milestones.done++;
        if (!m.dueDate || !m.completedAt || m.completedAt.getTime() <= m.dueDate.getTime() + DAY - 1) milestones.onTime++; else milestones.late++;
      } else if (m.status === "MISSED") milestones.missed++;
      else milestones.pending = (milestones.pending ?? 0) + 1; // never recorded either way: not measured, not held against the supplier
    }
    let delivery: DeliveryFacts | null = null;
    if (c.supplierProjectId) {
      const lines = await withPlatformStaffContext((s) => s.projectLine.findMany({
        where: { projectId: c.supplierProjectId!, archivedAt: null },
        select: { supplierInFull: true, supplierOnTime: true, internalOnTime: true, projectedDeliveryDate: true, actualDeliveryDate: true, goodsCollectedDate: true, supplierGad: true },
      }));
      const d: DeliveryFacts = { onTimeYes: 0, onTimeFlags: 0, inFullYes: 0, inFullFlags: 0, otifYes: 0, otifN: 0 };
      for (const l of lines) {
        const t = lineTimeliness(l, "SUPPLIER", cfg);
        if (t !== null) { d.onTimeFlags++; if (t) d.onTimeYes++; }
        if (l.supplierInFull !== null) { d.inFullFlags++; if (l.supplierInFull) d.inFullYes++; }
        if (t !== null && l.supplierInFull !== null) { d.otifN++; if (t && l.supplierInFull) d.otifYes++; }
      }
      delivery = d.onTimeFlags + d.inFullFlags > 0 ? d : null;
    }
    // The owner's own complaints and temperature logs that it linked to this contract: counts only.
    const links = await tx.tenderContractQualityLink.findMany({ where: { contractId: c.id } });
    const cs = await tx.qualityComplaint.findMany({ where: { id: { in: links.filter((l) => l.kind === "COMPLAINT").map((l) => l.refId) }, archivedAt: null, status: { not: "WITHDRAWN" } }, select: { outcome: true, isSerious: true } });
    const logs = await tx.batchTemperatureLog.findMany({ where: { id: { in: links.filter((l) => l.kind === "TEMPERATURE_LOG").map((l) => l.refId) } }, select: { hasExcursion: true } });
    const upheld = cs.filter((x) => x.outcome === "UPHELD" || x.outcome === "PARTLY_UPHELD");
    const quality: QualityFacts = {
      checked: qualityChecked, complaints: cs.length, concluded: cs.filter((x) => x.outcome).length,
      upheldEq: upheld.reduce((a, x) => a + (x.outcome === "UPHELD" ? 1 : 0.5), 0), seriousUpheld: upheld.filter((x) => x.isSerious).length,
      open: cs.filter((x) => !x.outcome).length, logs: logs.length, excursions: logs.filter((x) => x.hasExcursion).length,
    };
    return { cfg, milestones, delivery, quality };
  }

  /** Validates owner feedback before anything is written. */
  checkFeedback(f: OwnerFeedbackDto | undefined) {
    if (!f) return;
    const problem = feedbackProblem(f as FeedbackInput);
    if (problem) throw new BadRequestException(problem);
  }

  /** Writes the frozen record inside the close transaction. */
  async createRecord(tx: Tx, user: RequestUser, c: { id: string; organizationId: string; awardedOrganizationId: string; tenderId: string }, outcome: string, closedAt: Date, prep: ClosePrep, feedback: OwnerFeedbackDto | undefined) {
    const built = buildMeasures(prep.delivery, prep.milestones, (feedback as FeedbackInput | undefined) ?? null, prep.cfg, prep.quality);
    const pctOf = (k: string) => built.measures.find((m) => m.key === k)?.score ?? null;
    const clean = feedback ? { quality: feedback.quality, communication: feedback.communication, documentation: feedback.documentation, flexibility: feedback.flexibility, wouldUseAgain: feedback.wouldUseAgain, reasons: feedback.reasons ?? {}, comment: feedback.comment?.trim() || null } : null;
    return tx.tenderPerformanceRecord.create({ data: {
      organizationId: c.organizationId, awardedOrganizationId: c.awardedOrganizationId, tenderId: c.tenderId, contractId: c.id, outcome, closedAt,
      measuresJson: JSON.stringify(built.measures), overallScore: built.overallScore, band: built.band, coverage: built.coverage,
      milestonesTotal: prep.milestones.total, milestonesOnTime: prep.milestones.onTime,
      onTimePercent: pctOf("on_time"), inFullPercent: pctOf("in_full"), otifPercent: pctOf("otif"),
      feedbackJson: clean ? JSON.stringify(clean) : null, feedbackAverage: feedback ? feedbackAverage(feedback as FeedbackInput) : null,
      replyDeadline: new Date(closedAt.getTime() + REPLY_WINDOW_DAYS * DAY), createdById: user.id,
    } });
  }

  // ------------------------------------------------------------------ quality links (owner only)

  /** The owner's complaints and temperature logs it may tie to a contract, with the current links. */
  async qualityEvidence(user: RequestUser, contractId: string) {
    assertHasPermission(user, "tenders.award");
    return withTenantContext(user.organizationId, async (tx) => {
      const c = await tx.tenderContract.findUnique({ where: { id: contractId } });
      if (!c || c.organizationId !== user.organizationId) throw new NotFoundException("Contract not found.");
      const links = await tx.tenderContractQualityLink.findMany({ where: { contractId } });
      const canComplaints = user.platformStaffRole !== "NONE" || user.permissions.includes("quality.complaints.view");
      const complaints = canComplaints ? await tx.qualityComplaint.findMany({ where: { archivedAt: null, status: { not: "WITHDRAWN" } }, orderBy: { receivedAt: "desc" }, take: 150, select: { id: true, referenceNumber: true, title: true, status: true, outcome: true, isSerious: true, receivedAt: true } }) : [];
      const logs = await tx.batchTemperatureLog.findMany({ orderBy: { recordedAt: "desc" }, take: 150, select: { id: true, hasExcursion: true, readingSummary: true, recordedAt: true, productBatch: { select: { batchNumber: true } } } });
      const set = (k: string) => new Set(links.filter((l) => l.kind === k).map((l) => l.refId));
      const lc = set("COMPLAINT"), ll = set("TEMPERATURE_LOG");
      return {
        canComplaints, locked: c.status !== "ACTIVE",
        complaints: complaints.map((x) => ({ id: x.id, reference: x.referenceNumber, title: x.title, status: x.status, outcome: x.outcome, serious: x.isSerious, receivedAt: x.receivedAt, linked: lc.has(x.id) })),
        logs: logs.map((x) => ({ id: x.id, batchNumber: x.productBatch.batchNumber, summary: x.readingSummary, excursion: x.hasExcursion, recordedAt: x.recordedAt, linked: ll.has(x.id) })),
      };
    });
  }

  /** Replaces the links for a contract that is still active. */
  async setQualityLinks(user: RequestUser, contractId: string, complaintIds: string[], logIds: string[]) {
    assertHasPermission(user, "tenders.award");
    await withTenantContext(user.organizationId, async (tx) => {
      const c = await tx.tenderContract.findUnique({ where: { id: contractId } });
      if (!c || c.organizationId !== user.organizationId) throw new NotFoundException("Contract not found.");
      if (c.status !== "ACTIVE") throw new ConflictException("Links can only be changed while the contract is active.");
      // Only the owner's own rows are visible here (row-level security), so unknown ids simply find nothing.
      const okC = (await tx.qualityComplaint.findMany({ where: { id: { in: complaintIds } }, select: { id: true } })).map((x) => x.id);
      const okL = (await tx.batchTemperatureLog.findMany({ where: { id: { in: logIds } }, select: { id: true } })).map((x) => x.id);
      await tx.tenderContractQualityLink.deleteMany({ where: { contractId } });
      for (const id of okC) await tx.tenderContractQualityLink.create({ data: { organizationId: c.organizationId, contractId, kind: "COMPLAINT", refId: id, createdById: user.id } });
      for (const id of okL) await tx.tenderContractQualityLink.create({ data: { organizationId: c.organizationId, contractId, kind: "TEMPERATURE_LOG", refId: id, createdById: user.id } });
    });
    return this.qualityEvidence(user, contractId);
  }

  // ------------------------------------------------------------------ reading

  /** Shapes records and their responses for the two parties (full detail, including the owner's feedback text). */
  async shape(tx: Tx, contractIds: string[], viewerOrgId: string) {
    if (!contractIds.length) return new Map<string, unknown>();
    const records = await tx.tenderPerformanceRecord.findMany({ where: { contractId: { in: contractIds } } });
    const responses = await tx.tenderPerformanceResponse.findMany({ where: { recordId: { in: records.map((r) => r.id) } }, orderBy: { createdAt: "asc" } });
    const now = Date.now();
    return new Map(records.map((r) => {
      const rs = responses.filter((x) => x.recordId === r.id);
      const disputed = new Set(rs.filter((x) => x.kind === "DISPUTE").map((x) => x.measureKey));
      const answered = rs.some((x) => x.kind === "ANSWER");
      return [r.contractId, {
        id: r.id, contractId: r.contractId, outcome: r.outcome, closedAt: r.closedAt, overallScore: r.overallScore, band: r.band, coverage: r.coverage,
        measures: JSON.parse(r.measuresJson) as unknown[], feedback: r.feedbackJson ? JSON.parse(r.feedbackJson) : null, feedbackAverage: num(r.feedbackAverage),
        replyDeadline: r.replyDeadline, canRespond: !r.withdrawnAt && now <= r.replyDeadline.getTime(), withdrawn: !!r.withdrawnAt, withdrawnReason: r.withdrawnAt ? r.withdrawnReason : null,
        openDisputes: [...disputed].filter(() => !answered).length,
        responses: rs.map((x) => ({ id: x.id, kind: x.kind, measureKey: x.measureKey, body: x.body, own: x.byOrganizationId === viewerOrgId, createdAt: x.createdAt })),
      }] as const;
    }));
  }

  /** The manual payment log for a set of contracts. */
  async payments(tx: Tx, contractIds: string[], viewerOrgId: string) {
    if (!contractIds.length) return [];
    const rows = await tx.tenderContractPayment.findMany({ where: { contractId: { in: contractIds } }, orderBy: [{ dueDate: "asc" }, { recordedAt: "asc" }] });
    return rows.map((p) => ({
      id: p.id, contractId: p.contractId, reference: p.reference, description: p.description, amount: num(p.amount), currency: p.currency, invoiceDate: p.invoiceDate, dueDate: p.dueDate, paidDate: p.paidDate,
      status: p.paidDate ? (p.paidDate.getTime() <= p.dueDate.getTime() + DAY - 1 ? "PAID_ON_TIME" : "PAID_LATE") : (p.dueDate.getTime() + DAY - 1 < Date.now() ? "OVERDUE" : "OPEN"),
      recordedBy: p.recordedByOrganizationId === viewerOrgId ? "you" : "the other party",
    }));
  }

  /** The caller's own records, as supplier or as owner, with the counterparty named (these are the caller's own contracts). */
  async mine(user: RequestUser) {
    return withTenantContext(user.organizationId, async (tx) => {
      const records = await tx.tenderPerformanceRecord.findMany({ where: { withdrawnAt: null }, orderBy: { closedAt: "desc" }, take: 200 });
      const contracts = await tx.tenderContract.findMany({ where: { id: { in: records.map((r) => r.contractId) } }, select: { id: true, reference: true, title: true } });
      const orgIds = [...new Set(records.flatMap((r) => [r.organizationId, r.awardedOrganizationId]))];
      const names = new Map((await tx.organization.findMany({ where: { id: { in: orgIds } }, select: { id: true, name: true } })).map((o) => [o.id, o.name]));
      return records.map((r) => {
        const asSupplier = r.awardedOrganizationId === user.organizationId;
        const c = contracts.find((x) => x.id === r.contractId);
        return { id: r.id, contractId: r.contractId, tenderId: r.tenderId, contractReference: c?.reference ?? null, title: c?.title ?? null, role: asSupplier ? "SUPPLIER" : "ISSUER", counterpartyName: names.get(asSupplier ? r.organizationId : r.awardedOrganizationId) ?? null,
          outcome: r.outcome, closedAt: r.closedAt, overallScore: r.overallScore, band: r.band, coverage: r.coverage, feedbackAverage: num(r.feedbackAverage), replyDeadline: r.replyDeadline };
      });
    });
  }

  /** The anonymised aggregate for a supplier, for any signed-in organisation: bands and averages only, nothing that identifies an owner or a contract. */
  async supplierSummary(user: RequestUser, supplierOrgId: string) {
    assertHasPermission(user, "tenders.view");
    return supplierAggregate(supplierOrgId);
  }

  /** The anonymised payment practice of an owner, shown to suppliers deciding whether to bid. */
  async ownerPractice(user: RequestUser, ownerOrgId: string) {
    assertHasPermission(user, "tenders.view");
    return ownerPaymentPractice(ownerOrgId);
  }

  // ------------------------------------------------------------------ right of reply

  private async loadRecord(tx: Tx, user: RequestUser, recordId: string) {
    const r = await tx.tenderPerformanceRecord.findUnique({ where: { id: recordId } });
    if (!r || (r.organizationId !== user.organizationId && r.awardedOrganizationId !== user.organizationId)) throw new NotFoundException("Record not found.");
    return r;
  }

  async respond(user: RequestUser, recordId: string, dto: PerformanceResponseDto) {
    assertHasPermission(user, "tenders.bid");
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const rec = await this.loadRecord(tx, user, recordId);
      if (rec.awardedOrganizationId !== user.organizationId) throw new ForbiddenException("Only the supplier replies to its own record.");
      if (rec.withdrawnAt) throw new ConflictException("This record has been withdrawn.");
      if (Date.now() > rec.replyDeadline.getTime()) throw new ConflictException("The reply period for this record has ended.");
      if (dto.kind === "DISPUTE") {
        const keys = (JSON.parse(rec.measuresJson) as { key: string; weight: number }[]).filter((m) => m.weight > 0).map((m) => m.key);
        if (!dto.measureKey || !keys.includes(dto.measureKey)) throw new BadRequestException("Choose the measure you are disputing.");
      }
      await tx.tenderPerformanceResponse.create({ data: { organizationId: rec.organizationId, awardedOrganizationId: rec.awardedOrganizationId, tenderId: rec.tenderId, recordId: rec.id, kind: dto.kind, measureKey: dto.kind === "DISPUTE" ? dto.measureKey : null, body: dto.body.trim(), byOrganizationId: user.organizationId, byUserId: user.id } });
      return rec;
    });
    await appendTenderEvent({ organizationId: r.organizationId, counterpartyOrganizationId: r.awardedOrganizationId, tenderId: r.tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: dto.kind === "DISPUTE" ? "PERFORMANCE_DISPUTED" : "PERFORMANCE_REPLIED", summary: dto.kind === "DISPUTE" ? `Supplier disputed a measure on the performance record (${dto.measureKey})` : "Supplier replied to the performance record" });
    await this.tenders.notifyOrgs([r.organizationId], () => ({ title: dto.kind === "DISPUTE" ? "Supplier disputed a performance measure" : "Supplier replied to a performance record", body: dto.body.trim(), link: `/bids/status?id=${r.tenderId}`, subjectId: r.tenderId }), "TENDER_AWARD", user.id);
    return { ok: true, tenderId: r.tenderId };
  }

  async answer(user: RequestUser, recordId: string, dto: PerformanceAnswerDto) {
    assertHasPermission(user, "tenders.award");
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const rec = await this.loadRecord(tx, user, recordId);
      if (rec.organizationId !== user.organizationId) throw new ForbiddenException("Only the tender owner answers a dispute.");
      if (!(await tx.tenderPerformanceResponse.count({ where: { recordId, kind: "DISPUTE" } }))) throw new ConflictException("There is no dispute to answer.");
      await tx.tenderPerformanceResponse.create({ data: { organizationId: rec.organizationId, awardedOrganizationId: rec.awardedOrganizationId, tenderId: rec.tenderId, recordId: rec.id, kind: "ANSWER", body: dto.body.trim(), byOrganizationId: user.organizationId, byUserId: user.id } });
      return rec;
    });
    await appendTenderEvent({ organizationId: r.organizationId, counterpartyOrganizationId: r.awardedOrganizationId, tenderId: r.tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "PERFORMANCE_ANSWERED", summary: "Tender owner answered the supplier's dispute" });
    await this.tenders.notifyOrgs([r.awardedOrganizationId], () => ({ title: "The tender owner answered your dispute", body: dto.body.trim(), link: `/bids/status?id=${r.tenderId}`, subjectId: r.tenderId }), "TENDER_AWARD", user.id);
    return { ok: true, tenderId: r.tenderId };
  }

  /** Platform staff only: withdraw a record for evident error or abuse. The reason goes on the tender's timeline. */
  async withdraw(user: RequestUser, recordId: string, reason: string) {
    if (user.platformStaffRole === "NONE") throw new ForbiddenException("Only platform staff can withdraw a performance record.");
    if (!reason.trim()) throw new BadRequestException("Give the reason for withdrawing the record.");
    const r = await withPlatformStaffContext(async (tx) => {
      const rec = await tx.tenderPerformanceRecord.findUnique({ where: { id: recordId } });
      if (!rec) throw new NotFoundException("Record not found.");
      await tx.tenderPerformanceRecord.update({ where: { id: recordId }, data: { withdrawnAt: new Date(), withdrawnReason: reason.trim().slice(0, 1000) } });
      return rec;
    });
    await appendTenderEvent({ organizationId: r.organizationId, counterpartyOrganizationId: r.awardedOrganizationId, tenderId: r.tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "PERFORMANCE_WITHDRAWN", summary: "Platform staff withdrew the performance record", details: { reason: reason.trim() } });
    return { ok: true };
  }

  /** Platform staff: every performance record with the organisations named, for review. */
  async listForStaff(user: RequestUser) {
    if (user.platformStaffRole === "NONE") throw new ForbiddenException("Platform staff only.");
    return withPlatformStaffContext(async (tx) => {
      const recs = await tx.tenderPerformanceRecord.findMany({ orderBy: { closedAt: "desc" }, take: 300 });
      const orgIds = [...new Set(recs.flatMap((r) => [r.organizationId, r.awardedOrganizationId]))];
      const names = new Map((await tx.organization.findMany({ where: { id: { in: orgIds } }, select: { id: true, name: true } })).map((o) => [o.id, o.name]));
      const cons = new Map((await tx.tenderContract.findMany({ where: { id: { in: recs.map((r) => r.contractId) } }, select: { id: true, reference: true } })).map((c) => [c.id, c.reference]));
      const disputes = await tx.tenderPerformanceResponse.groupBy({ by: ["recordId"], where: { recordId: { in: recs.map((r) => r.id) }, kind: "DISPUTE" }, _count: { _all: true } });
      const dc = new Map(disputes.map((d) => [d.recordId, d._count._all]));
      return recs.map((r) => ({ id: r.id, contractReference: cons.get(r.contractId) ?? null, ownerName: names.get(r.organizationId) ?? null, supplierName: names.get(r.awardedOrganizationId) ?? null, outcome: r.outcome, closedAt: r.closedAt, overallScore: r.overallScore, band: r.band, disputes: dc.get(r.id) ?? 0, withdrawn: !!r.withdrawnAt, withdrawnReason: r.withdrawnReason }));
    });
  }

  /** Platform staff only: put a withdrawn record back. */
  async restore(user: RequestUser, recordId: string) {
    if (user.platformStaffRole === "NONE") throw new ForbiddenException("Only platform staff can restore a performance record.");
    const r = await withPlatformStaffContext(async (tx) => {
      const rec = await tx.tenderPerformanceRecord.findUnique({ where: { id: recordId } });
      if (!rec) throw new NotFoundException("Record not found.");
      await tx.tenderPerformanceRecord.update({ where: { id: recordId }, data: { withdrawnAt: null, withdrawnReason: null } });
      return rec;
    });
    await appendTenderEvent({ organizationId: r.organizationId, counterpartyOrganizationId: r.awardedOrganizationId, tenderId: r.tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "PERFORMANCE_RESTORED", summary: "Platform staff restored the performance record" });
    return { ok: true };
  }

  // ------------------------------------------------------------------ manual payment log

  private async payCtx(tx: Tx, user: RequestUser, contractId: string) {
    const c = await tx.tenderContract.findUnique({ where: { id: contractId } });
    const party = c ? (c.organizationId === user.organizationId ? "ISSUER" : c.awardedOrganizationId === user.organizationId ? "SUPPLIER" : null) : null;
    if (!c || !party) throw new NotFoundException("Contract not found.");
    assertHasPermission(user, party === "ISSUER" ? "tenders.award" : "tenders.bid");
    if (c.status === "DRAFT" || c.status === "AWAITING_SIGNATURE") throw new ConflictException("Payments can be logged once the contract is active.");
    return c;
  }

  async addPayment(user: RequestUser, contractId: string, dto: ContractPaymentDto) {
    const c = await withTenantContext(user.organizationId, async (tx) => {
      const c = await this.payCtx(tx, user, contractId);
      await tx.tenderContractPayment.create({ data: {
        organizationId: c.organizationId, awardedOrganizationId: c.awardedOrganizationId, tenderId: c.tenderId, contractId: c.id, reference: dto.reference.trim(), description: dto.description?.trim() || null,
        amount: dto.amount, currency: (dto.currency ?? c.currency)?.toUpperCase() ?? null, invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : null, dueDate: new Date(dto.dueDate),
        paidDate: dto.paidDate ? new Date(dto.paidDate) : null, recordedByOrganizationId: user.organizationId, recordedById: user.id,
      } });
      return c;
    });
    await appendTenderEvent({ organizationId: c.organizationId, counterpartyOrganizationId: c.awardedOrganizationId, tenderId: c.tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "PAYMENT_LOGGED", summary: `Payment ${dto.reference.trim()} logged on contract ${c.reference}${c.organizationId === user.organizationId ? "" : " (supplier)"}` });
    return { tenderId: c.tenderId };
  }

  async updatePayment(user: RequestUser, contractId: string, paymentId: string, dto: ContractPaymentUpdateDto) {
    const out = await withTenantContext(user.organizationId, async (tx) => {
      const c = await this.payCtx(tx, user, contractId);
      const p = await tx.tenderContractPayment.findFirst({ where: { id: paymentId, contractId } });
      if (!p) throw new NotFoundException("Payment not found.");
      const data: Record<string, unknown> = {};
      if (dto.dueDate) data.dueDate = new Date(dto.dueDate);
      if (dto.paidDate !== undefined) data.paidDate = dto.paidDate ? new Date(dto.paidDate) : null;
      if (dto.description !== undefined) data.description = dto.description.trim() || null;
      await tx.tenderContractPayment.update({ where: { id: p.id }, data });
      return { c, p };
    });
    if (dto.paidDate !== undefined) await appendTenderEvent({ organizationId: out.c.organizationId, counterpartyOrganizationId: out.c.awardedOrganizationId, tenderId: out.c.tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "PAYMENT_LOGGED", summary: `Payment ${out.p.reference} ${dto.paidDate ? "marked paid" : "marked unpaid"} on contract ${out.c.reference}${out.c.organizationId === user.organizationId ? "" : " (supplier)"}` });
    return { tenderId: out.c.tenderId };
  }
}
