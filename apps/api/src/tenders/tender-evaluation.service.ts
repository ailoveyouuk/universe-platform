import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { withPlatformStaffContext, withTenantContext } from "@universe/db";
import type { Prisma } from "@universe/db";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";
import type { CoiDto, GateDto, ModerationDto, SaveScoresDto, SetEvaluatorsDto } from "./dto/tenders.dto";
import { pastPerformanceScore, supplierAggregate } from "./tender-performance";
import { calculatedScores, mean, MODERATION_SPREAD, rankBids, spread, weightedTotal } from "./evaluation";
import { createNotifications } from "../notifications/notify";
import { appendTenderEvent } from "./tender-events";
import { effectiveStatus, TendersService } from "./tenders.service";

type Tx = Prisma.TransactionClient;
const num = (v: { toString(): string } | null | undefined) => (v === null || v === undefined ? null : Number(v.toString()));
const fullName = (u: { forename: string | null; surname: string | null; email: string }) => [u.forename, u.surname].filter(Boolean).join(" ") || u.email;

/**
 * People who may evaluate in a DEMO organisation besides its own users (2026-10-20): platform staff and users holding an access grant to it
 * (the demo picker). Lets a demo walkthrough use a real login as chair or evaluator. Always empty for a non-demo organisation.
 */
async function demoVisitors(orgId: string, term = "", ids?: string[]) {
  return withPlatformStaffContext(async (tx) => {
    const org = await tx.organization.findUnique({ where: { id: orgId }, select: { isDemo: true } });
    if (!org?.isDemo) return [] as { id: string; forename: string; surname: string; email: string }[];
    const match = term ? { OR: [{ forename: { contains: term } }, { surname: { contains: term } }, { email: { contains: term } }] } : {};
    return tx.user.findMany({
      where: { status: "ACTIVE", ...(ids ? { id: { in: ids } } : {}), ...match, OR: [{ platformStaffRole: { not: "NONE" } }, { organizationAccess: { some: { grantedOrganizationId: orgId } } }] },
      select: { id: true, forename: true, surname: true, email: true }, take: 25,
    });
  });
}

export type EvalPhase = "OPEN" | "CLOSED" | "OPENED" | "EVALUATING" | "SCORED" | "AWARDED";
export const phaseOf = (t: { status: string; closingAt: Date | null; bidsOpenedAt: Date | null; evaluationStartedAt: Date | null; scoringFinalisedAt: Date | null; awardedAt: Date | null }): EvalPhase =>
  t.status === "DRAFT" || t.status === "CANCELLED" ? "OPEN" : t.awardedAt ? "AWARDED" : t.scoringFinalisedAt ? "SCORED" : t.evaluationStartedAt ? "EVALUATING" : t.bidsOpenedAt ? "OPENED" : effectiveStatus(t as never) === "PUBLISHED" ? "OPEN" : "CLOSED";

/**
 * Evaluation (step 4, 2026-10-20). Bids are opened by the issuer after closing; named evaluators declare any conflict of interest,
 * record gate results and score the manual criteria privately; the chair moderates and finalises. Price and lead time are calculated
 * from the bids (the best scores 100). Only compliant bids (every gate passed) are scored and ranked.
 */
@Injectable()
export class TenderEvaluationService {
  constructor(private readonly tenders: TendersService) {}

  /** The viewer's standing on this tender: issuer authority, an assigned evaluator, or neither (refused). */
  async access(tx: Tx, user: RequestUser, tenderId: string) {
    assertHasPermission(user, "tenders.view");
    const t = await this.tenders.ownTender(tx, user, tenderId);
    const isIssuer = user.platformStaffRole !== "NONE" || user.permissions.includes("tenders.issue");
    const me = await tx.tenderEvaluator.findUnique({ where: { tenderId_userId: { tenderId, userId: user.id } } });
    if (!isIssuer && !me) throw new ForbiddenException("You are not assigned to evaluate this tender.");
    return { t, me, isIssuer };
  }

  private conflicts(me: { coiBidderIds: string | null } | null) { return new Set((me?.coiBidderIds ?? "").split(",").filter(Boolean)); }

  /** Everything the evaluation screens need, filtered to what this viewer may see. */
  async overview(user: RequestUser, tenderId: string) {
    return withTenantContext(user.organizationId, async (tx) => {
      const a = await this.access(tx, user, tenderId);
      return this.buildOverview(tx, user, a);
    });
  }

  private async buildOverview(tx: Tx, user: RequestUser, a: Awaited<ReturnType<TenderEvaluationService["access"]>>) {
    const { t, me, isIssuer } = a;
    const phase = phaseOf(t);
    const [criteria, lines, evaluators, awards, awardLines, complaints] = await Promise.all([
      tx.tenderCriterion.findMany({ where: { tenderId: t.id }, orderBy: { sortOrder: "asc" } }),
      tx.tenderLine.findMany({ where: { tenderId: t.id }, orderBy: { lineNumber: "asc" } }),
      tx.tenderEvaluator.findMany({ where: { tenderId: t.id }, orderBy: { createdAt: "asc" } }),
      tx.tenderAward.findMany({ where: { tenderId: t.id } }),
      tx.tenderAwardLine.findMany({ where: { tenderId: t.id } }),
      isIssuer ? tx.tenderComplaint.findMany({ where: { tenderId: t.id }, orderBy: { lodgedAt: "desc" } }) : Promise.resolve([]),
    ]);
    const inOrg = await tx.user.findMany({ where: { id: { in: evaluators.map((e) => e.userId) } }, select: { id: true, forename: true, surname: true, email: true } });
    const missing = evaluators.map((e) => e.userId).filter((id) => !inOrg.some((u) => u.id === id));
    const users = missing.length ? [...inOrg, ...(await demoVisitors(t.organizationId, "", missing))] : inOrg;
    const uName = new Map(users.map((u) => [u.id, fullName(u)]));
    const canSeeAll = isIssuer || me?.role === "CHAIR";
    const coiOk = !me || !!me.coiDeclaredAt;           // an evaluator sees no bids until the declaration is made
    const myConflicts = this.conflicts(me);

    let bidRows: unknown[] = [];
    let lotRows: unknown[] = [];
    if (t.bidsOpenedAt && coiOk) {
      const res = await this.results(tx, t.id);
      lotRows = res.lots.map((lot) => ({ ...lot, rows: lot.rows.filter((r) => !myConflicts.has(r.organizationId)) }));
      const ids = res.rows.map((r) => r.bidId);
      const [scores, gates, moderated] = await Promise.all([
        tx.tenderBidScore.findMany({ where: { bidId: { in: ids } } }),
        tx.tenderBidGate.findMany({ where: { bidId: { in: ids } } }),
        tx.tenderModeratedScore.findMany({ where: { bidId: { in: ids } } }),
      ]);
      const manual = res.criteria.filter((c) => c.kind === "SCORED" && c.metric === "MANUAL");
      bidRows = res.rows.filter((r) => !myConflicts.has(r.organizationId)).map((r) => {
        const mine: Record<string, unknown> = {}; const others: Record<string, unknown[]> = {}; const proposed: Record<string, number | null> = {}; const flag: Record<string, boolean> = {};
        for (const c of manual) {
          const all = scores.filter((s) => s.bidId === r.bidId && s.criterionId === c.id);
          const m = all.find((s) => s.evaluatorUserId === user.id);
          if (m) mine[c.id] = { score: num(m.score), rationale: m.rationale, submitted: !!m.submittedAt };
          const sub = all.filter((s) => s.submittedAt);
          if (canSeeAll) { others[c.id] = sub.map((s) => ({ evaluator: uName.get(s.evaluatorUserId) ?? "Evaluator", score: num(s.score), rationale: s.rationale })); }
          proposed[c.id] = mean(sub.map((s) => num(s.score)!));
          flag[c.id] = spread(sub.map((s) => num(s.score)!)) > MODERATION_SPREAD;
        }
        const mySubmitted = manual.length > 0 && manual.every((c) => (mine[c.id] as { submitted?: boolean } | undefined)?.submitted);
        return {
          ...r, gates: Object.fromEntries(gates.filter((g) => g.bidId === r.bidId).map((g) => [g.criterionId, { passed: g.passed, notes: g.notes }])),
          mine, mySubmitted, ...(canSeeAll ? { others } : {}), proposed, spreadFlag: flag,
          moderated: Object.fromEntries(moderated.filter((m) => m.bidId === r.bidId && !m.isCalculated).map((m) => [m.criterionId, { score: num(m.score), rationale: m.rationale }])),
        };
      });
    }
    const orgNames = await this.orgNames(tx, awards.map((x) => x.awardedOrganizationId));
    const submittedPerEval = new Map<string, number>();
    // The real number of submitted bids, not the rows this viewer may see: before a conflict declaration an evaluator sees no bids, which must not read as "no bids".
    const submittedCount = await tx.tenderBid.count({ where: { tenderId: t.id, status: "SUBMITTED" } });
    const startProblems = this.startProblems(t, evaluators, submittedCount);
    return {
      tender: { id: t.id, referenceNumber: t.referenceNumber, title: t.title, currency: t.currency, status: effectiveStatus(t), closingAt: t.closingAt, timeZone: t.timeZone, emergencyProcurement: t.emergencyProcurement, emergencyReason: t.emergencyReason, allowSingleEvaluator: t.allowSingleEvaluator, singleEvaluatorReason: t.singleEvaluatorReason, standstillEnabled: t.standstillEnabled, standstillWorkingDays: t.standstillWorkingDays, bidsOpenedAt: t.bidsOpenedAt, evaluationStartedAt: t.evaluationStartedAt, scoringFinalisedAt: t.scoringFinalisedAt, awardedAt: t.awardedAt, standstillEndsAt: t.standstillEndsAt },
      phase,
      viewer: { isIssuer, isEvaluator: !!me, role: me?.role ?? null, coiDeclared: !!me?.coiDeclaredAt, coiRequired: !!me && !me.coiDeclaredAt },
      evaluators: isIssuer || me?.role === "CHAIR" ? evaluators.map((e) => ({ userId: e.userId, name: uName.get(e.userId) ?? "Evaluator", role: e.role, coiDeclaredAt: e.coiDeclaredAt, coiNoConflict: e.coiNoConflict, conflictCount: this.conflicts(e).size, submitted: submittedPerEval.get(e.userId) ?? 0 })) : evaluators.filter((e) => e.userId === user.id).map((e) => ({ userId: e.userId, name: uName.get(e.userId) ?? "You", role: e.role, coiDeclaredAt: e.coiDeclaredAt, coiNoConflict: e.coiNoConflict, conflictCount: this.conflicts(e).size, submitted: 0 })),
      canStart: phase === "OPENED" && startProblems.length === 0, startProblems,
      criteria: criteria.map((c) => ({ id: c.id, title: c.title, kind: c.kind, weight: num(c.weight), metric: c.metric, description: c.description })),
      lines: lines.map((l) => ({ id: l.id, lineNumber: l.lineNumber, lotNumber: l.lotNumber, lotTitle: l.lotTitle, description: l.description, quantity: l.quantity?.toString() ?? null, unit: l.unit })),
      bids: bidRows,
      lots: lotRows,
      awards: awards.map((x) => ({ awardId: x.id, bidId: x.bidId, organizationId: x.awardedOrganizationId, organizationName: orgNames.get(x.awardedOrganizationId) ?? null, reason: x.reason, awardedAt: x.awardedAt, lines: awardLines.filter((l) => l.awardId === x.id).map((l) => ({ tenderLineId: l.tenderLineId, sharePercent: num(l.sharePercent) })) })),
      complaints: complaints.map((c) => ({ id: c.id, organizationId: c.organizationId, body: c.body, status: c.status, response: c.response, lodgedAt: c.lodgedAt, respondedAt: c.respondedAt })),
    };
  }

  private async orgNames(tx: Tx, ids: string[]) {
    const orgs = await tx.organization.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    return new Map(orgs.map((o) => [o.id, o.name]));
  }

  private startProblems(t: { closingAt: Date | null; bidsOpenedAt: Date | null; allowSingleEvaluator: boolean; singleEvaluatorReason: string | null }, evaluators: { role: string }[], bidCount: number) {
    const p: string[] = [];
    if (!t.bidsOpenedAt) p.push("Open the bids first.");
    if (bidCount === 0 && t.bidsOpenedAt) p.push("There are no submitted bids to evaluate.");
    if (evaluators.filter((e) => e.role === "CHAIR").length !== 1) p.push("Assign exactly one chair.");
    const min = t.allowSingleEvaluator ? 1 : 2;
    if (evaluators.length < min) p.push(t.allowSingleEvaluator ? "Assign at least one evaluator." : "Assign at least two evaluators, or switch on single-evaluator decisions for this tender when you build it.");
    return p;
  }

  /**
   * Per-bid results: gates, calculated scores, moderated manual scores, weighted total and rank. Compliant means every gate has been
   * recorded and passed. This is the one place totals are computed, so the screens, the award and the debriefs always agree.
   */
  async results(tx: Tx, tenderId: string) {
    const [criteria, bids] = await Promise.all([
      tx.tenderCriterion.findMany({ where: { tenderId }, orderBy: { sortOrder: "asc" } }),
      tx.tenderBid.findMany({ where: { tenderId, status: "SUBMITTED" }, orderBy: { submittedAt: "asc" } }),
    ]);
    const ids = bids.map((b) => b.id);
    const [bidLines, tenderLines, gates, moderated, orgs] = await Promise.all([
      tx.tenderBidLine.findMany({ where: { bidId: { in: ids } } }),
      tx.tenderLine.findMany({ where: { tenderId } }),
      tx.tenderBidGate.findMany({ where: { bidId: { in: ids } } }),
      tx.tenderModeratedScore.findMany({ where: { bidId: { in: ids } } }),
      tx.organization.findMany({ where: { id: { in: bids.map((b) => b.organizationId) } }, select: { id: true, name: true } }),
    ]);
    const qty = new Map(tenderLines.map((l) => [l.id, num(l.quantity) ?? 1]));
    const gateCrit = criteria.filter((c) => c.kind === "GATE");
    const scored = criteria.filter((c) => c.kind === "SCORED");
    const base = bids.map((b) => {
      const priced = bidLines.filter((l) => l.bidId === b.id && !l.noBid && l.unitPrice !== null);
      const w = priced.reduce((s, l) => s + (qty.get(l.tenderLineId) ?? 1), 0);
      const leads = priced.filter((l) => l.leadTimeDays !== null);
      const lw = leads.reduce((s, l) => s + (qty.get(l.tenderLineId) ?? 1), 0);
      const avgLeadDays = lw > 0 ? Math.round((leads.reduce((s, l) => s + l.leadTimeDays! * (qty.get(l.tenderLineId) ?? 1), 0) / lw) * 10) / 10 : null;
      void w;
      const g = gates.filter((x) => x.bidId === b.id);
      const gatesComplete = gateCrit.every((c) => g.some((x) => x.criterionId === c.id));
      const failed = g.some((x) => !x.passed);
      return { bidId: b.id, organizationId: b.organizationId, organizationName: orgs.find((o) => o.id === b.organizationId)?.name ?? null, submittedAt: b.submittedAt, total: num(b.totalTenderCurrency), avgLeadDays, pricedLineIds: priced.map((l) => l.tenderLineId), partial: priced.length < tenderLines.length, gatesComplete, failedGate: failed, compliant: gatesComplete && !failed };
    });
    const calc = calculatedScores(base.filter((b) => b.compliant).map((b) => ({ bidId: b.bidId, totalTenderCurrency: b.total, avgLeadDays: b.avgLeadDays })));
    const weighted = scored.map((c) => ({ id: c.id, weight: num(c.weight) ?? 0 }));
    // Past performance on the platform (step 6 follow-up): the supplier's anonymised aggregate average score; no history scores the neutral line.
    // Once scoring is finalised the stored score is used, so later records cannot reorder a finished evaluation.
    const past = new Map<string, number>();
    if (scored.some((c) => c.metric === "PAST_PERFORMANCE")) {
      for (const b of base.filter((x) => x.compliant)) past.set(b.bidId, pastPerformanceScore(await supplierAggregate(b.organizationId)));
    }
    const rows = base.map((b) => {
      const c = calc.get(b.bidId);
      const calculated: Record<string, number | null> = {};
      const scores: Record<string, number | undefined> = {};
      for (const cr of scored) {
        if (cr.metric === "PRICE") { calculated[cr.id] = c?.price ?? null; if (c?.price != null) scores[cr.id] = c.price; }
        else if (cr.metric === "PAST_PERFORMANCE") {
          const stored = moderated.find((x) => x.bidId === b.bidId && x.criterionId === cr.id && x.isCalculated);
          const v = stored ? num(stored.score) : past.get(b.bidId) ?? null;
          calculated[cr.id] = v; if (v != null) scores[cr.id] = v;
        }
        else if (cr.metric === "LEAD_TIME") { calculated[cr.id] = c?.leadTime ?? null; if (c?.leadTime != null) scores[cr.id] = c.leadTime; }
        else { const m = moderated.find((x) => x.bidId === b.bidId && x.criterionId === cr.id && !x.isCalculated); if (m) scores[cr.id] = num(m.score)!; }
      }
      return { ...b, calculated, scores, totalScore: b.compliant ? weightedTotal(weighted, scores) : null };
    });
    const ranked = rankBids(rows.map((r) => ({ ...r, total: r.totalScore, price: r.total })));
    // Lots (step 7): where lines carry lot numbers, each lot is also scored and ranked on its own. A bidder is in a lot only if it priced every line in it.
    // Price and lead time are worked out on the lot's lines; gates, manual scores and past performance are tender-wide and carry over unchanged.
    const lotNos = [...new Set(tenderLines.map((l) => l.lotNumber).filter((n): n is number => n !== null))].sort((a, b) => a - b);
    const lots = lotNos.map((n) => {
      const ls = tenderLines.filter((l) => l.lotNumber === n);
      const entries = base.filter((b) => b.compliant).flatMap((b) => {
        const bl = ls.map((l) => bidLines.find((x) => x.bidId === b.bidId && x.tenderLineId === l.id));
        if (bl.some((x) => !x || x.noBid || x.unitPrice === null)) return [];
        const rate = num(bids.find((x) => x.id === b.bidId)?.fxRate) ?? 1;
        const total = Math.round(bl.reduce((s, x, i) => s + num(x!.unitPrice)! * (num(ls[i].quantity) ?? 1), 0) * rate * 100) / 100;
        const lw = bl.filter((x) => x!.leadTimeDays !== null);
        const q = (i: number) => num(ls[bl.indexOf(lw[i])].quantity) ?? 1;
        const wsum = lw.reduce((s, _x, i) => s + q(i), 0);
        const avgLeadDays = wsum > 0 ? Math.round((lw.reduce((s, x, i) => s + x!.leadTimeDays! * q(i), 0) / wsum) * 10) / 10 : null;
        return [{ bidId: b.bidId, organizationId: b.organizationId, organizationName: b.organizationName, total, avgLeadDays }];
      });
      const lc = calculatedScores(entries.map((e) => ({ bidId: e.bidId, totalTenderCurrency: e.total, avgLeadDays: e.avgLeadDays })));
      const lrows = entries.map((e) => {
        const c = lc.get(e.bidId); const sc: Record<string, number | undefined> = {};
        for (const cr of scored) {
          if (cr.metric === "PRICE") { if (c?.price != null) sc[cr.id] = c.price; }
          else if (cr.metric === "LEAD_TIME") { if (c?.leadTime != null) sc[cr.id] = c.leadTime; }
          else sc[cr.id] = rows.find((r) => r.bidId === e.bidId)?.scores[cr.id];
        }
        return { ...e, totalScore: weightedTotal(weighted, sc), price: e.total };
      });
      const lr = rankBids(lrows.map((r) => ({ ...r, total: r.totalScore }))).map(({ total: _t, ...r }) => ({ bidId: r.bidId, organizationId: r.organizationId, organizationName: r.organizationName, lotTotal: r.price, avgLeadDays: r.avgLeadDays, totalScore: r.totalScore, rank: r.rank }));
      return { lotNumber: n, lotTitle: ls.find((l) => l.lotTitle)?.lotTitle ?? null, lineIds: ls.map((l) => l.id), rows: lr.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)) };
    });
    return { criteria, lots, rows: ranked.map(({ total: _t, price: _p, ...r }) => ({ ...r, total: _p, totalScore: _t })) };
  }

  // ----------------------------------------------------------- set-up

  async listCandidates(user: RequestUser, tenderId: string, q = "") {
    assertHasPermission(user, "tenders.issue");
    return withTenantContext(user.organizationId, async (tx) => {
      await this.tenders.ownTender(tx, user, tenderId);
      const term = q.trim().slice(0, 80);
      const users = await tx.user.findMany({
        where: { organizationId: user.organizationId, status: "ACTIVE", ...(term ? { OR: [{ forename: { contains: term } }, { surname: { contains: term } }, { email: { contains: term } }] } : {}) },
        select: { id: true, forename: true, surname: true, email: true }, orderBy: [{ forename: "asc" }, { surname: "asc" }], take: 25,
      });
      const visitors = await demoVisitors(user.organizationId, term);
      const all = [...users, ...visitors.filter((v) => !users.some((u) => u.id === v.id))];
      return all.map((u) => ({ id: u.id, name: fullName(u), email: u.email }));
    });
  }

  async setEvaluators(user: RequestUser, tenderId: string, dto: SetEvaluatorsDto) {
    assertHasPermission(user, "tenders.issue");
    const t = await withTenantContext(user.organizationId, async (tx) => {
      const t = await this.tenders.ownTender(tx, user, tenderId);
      if (t.evaluationStartedAt) throw new ConflictException("Evaluators cannot be changed once evaluation has started.");
      if (t.status === "DRAFT" || t.status === "CANCELLED") throw new ConflictException("This tender is not in a state that can be evaluated.");
      if (new Set(dto.evaluators.map((e) => e.userId)).size !== dto.evaluators.length) throw new BadRequestException("Each person can be assigned once.");
      if (dto.evaluators.filter((e) => e.role === "CHAIR").length > 1) throw new BadRequestException("Only one chair.");
      const valid = await tx.user.findMany({ where: { organizationId: user.organizationId, id: { in: dto.evaluators.map((e) => e.userId) }, status: "ACTIVE" }, select: { id: true } });
      let validCount = valid.length;
      if (validCount !== dto.evaluators.length) {
        const rest = dto.evaluators.map((e) => e.userId).filter((id) => !valid.some((v) => v.id === id));
        validCount += (await demoVisitors(user.organizationId, "", rest)).length;
      }
      if (validCount !== dto.evaluators.length) throw new BadRequestException("Evaluators must be active users of your organisation.");
      const existing = await tx.tenderEvaluator.findMany({ where: { tenderId } });
      const keep = new Set(dto.evaluators.map((e) => e.userId));
      await tx.tenderEvaluator.deleteMany({ where: { tenderId, userId: { notIn: [...keep] } } });
      for (const e of dto.evaluators) {
        const had = existing.find((x) => x.userId === e.userId);
        if (had) await tx.tenderEvaluator.update({ where: { id: had.id }, data: { role: e.role } });
        else await tx.tenderEvaluator.create({ data: { organizationId: user.organizationId, tenderId, userId: e.userId, role: e.role } });
      }
      const fresh = dto.evaluators.filter((e) => !existing.some((x) => x.userId === e.userId));
      if (fresh.length) await createNotifications(tx, fresh.map((e) => ({
        organizationId: user.organizationId, recipientUserId: e.userId, actorUserId: user.id, kind: "TENDER_EVALUATOR_ASSIGNED", category: "TENDER",
        title: `You are an evaluator: ${t.referenceNumber}`.slice(0, 300),
        body: `${e.role === "CHAIR" ? "You have been named chair of the evaluation" : "You have been assigned to evaluate"} ${t.title}. You must declare any conflict of interest before you can see the bids.`,
        link: `/tenders/evaluate?id=${tenderId}`, subjectType: "TENDER", subjectId: tenderId,
      })));
      return t;
    });
    await appendTenderEvent({ organizationId: t.organizationId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "EVALUATORS_ASSIGNED", summary: `Evaluators assigned (${dto.evaluators.length})` });
    return this.overview(user, tenderId);
  }

  async declareConflict(user: RequestUser, tenderId: string, dto: CoiDto) {
    assertHasPermission(user, "tenders.view");
    const t = await withTenantContext(user.organizationId, async (tx) => {
      const t = await this.tenders.ownTender(tx, user, tenderId);
      const me = await tx.tenderEvaluator.findUnique({ where: { tenderId_userId: { tenderId, userId: user.id } } });
      if (!me) throw new ForbiddenException("You are not assigned to evaluate this tender.");
      if (t.evaluationStartedAt && me.coiDeclaredAt) throw new ConflictException("Your declaration is already made and cannot be changed once evaluation has started. Tell the chair if something has changed.");
      const ids = dto.noConflict ? [] : [...new Set(dto.conflictedOrganisationIds ?? [])];
      if (!dto.noConflict && ids.length === 0) throw new BadRequestException("Choose the organisations you have a conflict with, or confirm you have none.");
      if (!dto.noConflict && !dto.notes?.trim()) throw new BadRequestException("Say briefly what the conflict is.");
      await tx.tenderEvaluator.update({ where: { id: me.id }, data: { coiDeclaredAt: new Date(), coiNoConflict: dto.noConflict, coiBidderIds: ids.join(","), coiNotes: dto.notes ?? null } });
      return t;
    });
    await appendTenderEvent({ organizationId: t.organizationId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "COI_DECLARED", summary: dto.noConflict ? "An evaluator declared no conflict of interest" : "An evaluator declared a conflict of interest and was excluded from the bids concerned" });
    return this.overview(user, tenderId);
  }

  /** Organisations that have bid, for the conflict declaration. Names only; nothing about the bids. */
  async bidderOptions(user: RequestUser, tenderId: string) {
    return withTenantContext(user.organizationId, async (tx) => {
      const { t } = await this.access(tx, user, tenderId);
      if (!t.bidsOpenedAt) throw new ConflictException("The bids have not been opened yet.");
      const bids = await tx.tenderBid.findMany({ where: { tenderId, status: "SUBMITTED" }, select: { organizationId: true } });
      const names = await this.orgNames(tx, bids.map((b) => b.organizationId));
      return bids.map((b) => ({ id: b.organizationId, name: names.get(b.organizationId) ?? "Organisation" })).sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  async start(user: RequestUser, tenderId: string) {
    assertHasPermission(user, "tenders.issue");
    const t = await withTenantContext(user.organizationId, async (tx) => {
      const t = await this.tenders.ownTender(tx, user, tenderId);
      if (t.evaluationStartedAt) throw new ConflictException("Evaluation has already started.");
      const evaluators = await tx.tenderEvaluator.findMany({ where: { tenderId } });
      const count = await tx.tenderBid.count({ where: { tenderId, status: "SUBMITTED" } });
      const problems = this.startProblems(t, evaluators, count);
      if (problems.length) throw new BadRequestException({ message: "Evaluation cannot start yet.", problems });
      await tx.tender.update({ where: { id: tenderId }, data: { status: "EVALUATING", evaluationStartedAt: new Date() } });
      return t;
    });
    await appendTenderEvent({ organizationId: t.organizationId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "EVALUATION_STARTED", summary: "Evaluation started" });
    return this.overview(user, tenderId);
  }

  // ----------------------------------------------------------- evaluating

  /** An evaluator who has declared, on a bid they are not conflicted with, while evaluation is open. */
  private async evaluatorOn(tx: Tx, user: RequestUser, tenderId: string, bidId: string) {
    assertHasPermission(user, "tenders.view");
    const t = await this.tenders.ownTender(tx, user, tenderId);
    const me = await tx.tenderEvaluator.findUnique({ where: { tenderId_userId: { tenderId, userId: user.id } } });
    if (!me) throw new ForbiddenException("Only an assigned evaluator can do this.");
    if (!me.coiDeclaredAt) throw new ForbiddenException("Make your conflict-of-interest declaration first.");
    if (!t.evaluationStartedAt) throw new ConflictException("Evaluation has not started.");
    if (t.scoringFinalisedAt) throw new ConflictException("Scoring has been finalised.");
    const bid = await tx.tenderBid.findFirst({ where: { id: bidId, tenderId, status: "SUBMITTED" } });
    if (!bid) throw new NotFoundException("Bid not found.");
    if (this.conflicts(me).has(bid.organizationId)) throw new ForbiddenException("You declared a conflict with this bidder.");
    return { t, me, bid };
  }

  async recordGate(user: RequestUser, tenderId: string, dto: GateDto) {
    await withTenantContext(user.organizationId, async (tx) => {
      const { t } = await this.evaluatorOn(tx, user, tenderId, dto.bidId);
      const c = await tx.tenderCriterion.findFirst({ where: { id: dto.criterionId, tenderId, kind: "GATE" } });
      if (!c) throw new BadRequestException("That is not a gate on this tender.");
      if (!dto.passed && !dto.notes?.trim()) throw new BadRequestException("Say why the bid failed this gate.");
      await tx.tenderBidGate.upsert({ where: { bidId_criterionId: { bidId: dto.bidId, criterionId: dto.criterionId } }, create: { organizationId: t.organizationId, tenderId, bidId: dto.bidId, criterionId: dto.criterionId, passed: dto.passed, notes: dto.notes ?? null, recordedById: user.id }, update: { passed: dto.passed, notes: dto.notes ?? null, recordedById: user.id, recordedAt: new Date() } });
    });
    return this.overview(user, tenderId);
  }

  /** Saves one evaluator's scores for one bid. Submitting locks them. */
  async saveScores(user: RequestUser, tenderId: string, dto: SaveScoresDto) {
    await withTenantContext(user.organizationId, async (tx) => {
      const { t } = await this.evaluatorOn(tx, user, tenderId, dto.bidId);
      const manual = await tx.tenderCriterion.findMany({ where: { tenderId, kind: "SCORED", metric: "MANUAL" } });
      const ids = new Set(manual.map((c) => c.id));
      const existing = await tx.tenderBidScore.findMany({ where: { bidId: dto.bidId, evaluatorUserId: user.id } });
      if (existing.some((e) => e.submittedAt)) throw new ConflictException("You have already submitted your scores for this bid. They are locked.");
      for (const s of dto.scores) {
        if (!ids.has(s.criterionId)) throw new BadRequestException("That criterion is scored automatically or is not on this tender.");
        const data = { score: s.score, rationale: s.rationale ?? null };
        await tx.tenderBidScore.upsert({ where: { bidId_criterionId_evaluatorUserId: { bidId: dto.bidId, criterionId: s.criterionId, evaluatorUserId: user.id } }, create: { organizationId: t.organizationId, tenderId, bidId: dto.bidId, criterionId: s.criterionId, evaluatorUserId: user.id, ...data }, update: data });
      }
      if (dto.submit) {
        const mine = await tx.tenderBidScore.findMany({ where: { bidId: dto.bidId, evaluatorUserId: user.id } });
        const missing = manual.filter((c) => { const m = mine.find((x) => x.criterionId === c.id); return !m || !m.rationale?.trim(); });
        if (missing.length) throw new BadRequestException({ message: "Score every criterion and give a reason for each before submitting.", problems: missing.map((c) => c.title) });
        await tx.tenderBidScore.updateMany({ where: { bidId: dto.bidId, evaluatorUserId: user.id }, data: { submittedAt: new Date() } });
      }
    });
    return this.overview(user, tenderId);
  }

  async moderate(user: RequestUser, tenderId: string, dto: ModerationDto) {
    await withTenantContext(user.organizationId, async (tx) => {
      const { t, me } = await this.chairOn(tx, user, tenderId);
      const bid = await tx.tenderBid.findFirst({ where: { id: dto.bidId, tenderId, status: "SUBMITTED" } });
      if (!bid) throw new NotFoundException("Bid not found.");
      if (this.conflicts(me).has(bid.organizationId)) throw new ForbiddenException("You declared a conflict with this bidder.");
      const c = await tx.tenderCriterion.findFirst({ where: { id: dto.criterionId, tenderId, kind: "SCORED", metric: "MANUAL" } });
      if (!c) throw new BadRequestException("That criterion is scored automatically or is not on this tender.");
      const data = { score: dto.score, rationale: dto.rationale ?? null, recordedById: user.id, isCalculated: false, recordedAt: new Date() };
      await tx.tenderModeratedScore.upsert({ where: { bidId_criterionId: { bidId: dto.bidId, criterionId: dto.criterionId } }, create: { organizationId: t.organizationId, tenderId, bidId: dto.bidId, criterionId: dto.criterionId, ...data }, update: data });
    });
    return this.overview(user, tenderId);
  }

  private async chairOn(tx: Tx, user: RequestUser, tenderId: string) {
    assertHasPermission(user, "tenders.view");
    const t = await this.tenders.ownTender(tx, user, tenderId);
    const me = await tx.tenderEvaluator.findUnique({ where: { tenderId_userId: { tenderId, userId: user.id } } });
    if (!me || me.role !== "CHAIR") throw new ForbiddenException("Only the chair can do this.");
    if (!me.coiDeclaredAt) throw new ForbiddenException("Make your conflict-of-interest declaration first.");
    if (!t.evaluationStartedAt) throw new ConflictException("Evaluation has not started.");
    if (t.scoringFinalisedAt) throw new ConflictException("Scoring has been finalised.");
    return { t, me };
  }

  /**
   * The chair closes scoring. Every compliant bid needs every gate recorded and every evaluator's scores in; anything the chair has not
   * moderated takes the evaluators' average, except where evaluators differ widely, which needs a written reason. The calculated
   * price and lead-time scores are stored with the rest so the result can be reproduced later.
   */
  async finalise(user: RequestUser, tenderId: string) {
    const t = await withTenantContext(user.organizationId, async (tx) => {
      const { t } = await this.chairOn(tx, user, tenderId);
      const evaluators = await tx.tenderEvaluator.findMany({ where: { tenderId } });
      const res = await this.results(tx, tenderId);
      const problems: string[] = [];
      const incompleteGates = res.rows.filter((r) => !r.gatesComplete);
      for (const r of incompleteGates) problems.push(`${r.organizationName}: record every gate.`);
      const compliant = res.rows.filter((r) => r.compliant);
      if (compliant.length === 0) problems.push("No bid has passed every gate, so there is nothing to score. Cancel the tender or reconsider the gate results.");
      const manual = res.criteria.filter((c) => c.kind === "SCORED" && c.metric === "MANUAL");
      const scores = await tx.tenderBidScore.findMany({ where: { tenderId } });
      const moderated = await tx.tenderModeratedScore.findMany({ where: { tenderId } });
      const writes: { bidId: string; criterionId: string; score: number; rationale: string | null; isCalculated: boolean }[] = [];
      for (const r of compliant) {
        const eligibleEvaluators = evaluators.filter((e) => !this.conflicts(e).has(r.organizationId));
        for (const c of manual) {
          const sub = scores.filter((s) => s.bidId === r.bidId && s.criterionId === c.id && s.submittedAt);
          const missing = eligibleEvaluators.filter((e) => !sub.some((s) => s.evaluatorUserId === e.userId));
          if (missing.length) { problems.push(`${r.organizationName} · ${c.title}: ${missing.length} evaluator${missing.length > 1 ? "s have" : " has"} not submitted scores.`); continue; }
          const m = moderated.find((x) => x.bidId === r.bidId && x.criterionId === c.id && !x.isCalculated);
          const vals = sub.map((s) => num(s.score)!);
          if (!m && spread(vals) > MODERATION_SPREAD) { problems.push(`${r.organizationName} · ${c.title}: evaluators differ by ${Math.round(spread(vals))} points; moderate this score and give a reason.`); continue; }
          if (m && spread(vals) > MODERATION_SPREAD && !m.rationale?.trim()) { problems.push(`${r.organizationName} · ${c.title}: give a reason for the moderated score.`); continue; }
          if (!m) writes.push({ bidId: r.bidId, criterionId: c.id, score: mean(vals) ?? 0, rationale: "Average of the evaluators' scores.", isCalculated: false });
        }
        for (const c of res.criteria.filter((x) => x.kind === "SCORED" && x.metric !== "MANUAL")) {
          const v = r.calculated[c.id];
          if (v != null) writes.push({ bidId: r.bidId, criterionId: c.id, score: v, rationale: c.metric === "PRICE" ? "Calculated: lowest compliant price scores 100." : c.metric === "PAST_PERFORMANCE" ? "Calculated: average performance score on closed Universe contracts; no history scores 70." : "Calculated: shortest lead time scores 100.", isCalculated: true });
          else problems.push(`${r.organizationName} · ${c.title}: cannot be calculated (missing prices or lead times).`);
        }
      }
      if (problems.length) throw new BadRequestException({ message: "Scoring cannot be finalised yet.", problems });
      for (const w of writes) {
        await tx.tenderModeratedScore.upsert({ where: { bidId_criterionId: { bidId: w.bidId, criterionId: w.criterionId } }, create: { organizationId: t.organizationId, tenderId, ...w, recordedById: user.id }, update: { score: w.score, rationale: w.rationale, isCalculated: w.isCalculated, recordedById: user.id, recordedAt: new Date() } });
      }
      await tx.tender.update({ where: { id: tenderId }, data: { scoringFinalisedAt: new Date() } });
      return t;
    });
    await appendTenderEvent({ organizationId: t.organizationId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "SCORING_FINALISED", summary: "Scoring finalised" });
    return this.overview(user, tenderId);
  }
}
