import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { withPlatformStaffContext, withTenantContext } from "@universe/db";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";
import type { AwardDto } from "./dto/tenders.dto";
import { addWorkingDays, overAllocatedLines } from "./evaluation";
import { appendTenderEvent } from "./tender-events";
import { TenderEvaluationService } from "./tender-evaluation.service";
import { effectiveStatus, TendersService } from "./tenders.service";
import { TenderBidProjectsService } from "./tender-bid-projects.service";

const num = (v: { toString(): string } | null | undefined) => (v === null || v === undefined ? null : Number(v.toString()));

/**
 * Award, debrief, complaints and the participant-facing status page (step 4, 2026-10-20). A tender can have several awards (a
 * framework with more than one supplier, or different suppliers for different lines); each covers named lines with a share of the
 * quantity. Every submitted bidder receives a debrief at award. The status page shows milestones and counts, never other bidders.
 */
@Injectable()
export class TenderAwardService {
  constructor(private readonly tenders: TendersService, private readonly evaluation: TenderEvaluationService, private readonly bidProjects: TenderBidProjectsService = new TenderBidProjectsService()) {}

  async award(user: RequestUser, tenderId: string, dto: AwardDto) {
    assertHasPermission(user, "tenders.issue");
    const out = await withTenantContext(user.organizationId, async (tx) => {
      const t = await this.tenders.ownTender(tx, user, tenderId);
      if (!t.scoringFinalisedAt) throw new ConflictException("Finalise scoring before awarding.");
      if (t.awardedAt) throw new ConflictException("This tender has already been awarded.");
      const res = await this.evaluation.results(tx, tenderId);
      const problems: string[] = [];
      const bidIds = dto.awards.map((a) => a.bidId);
      if (new Set(bidIds).size !== bidIds.length) throw new BadRequestException("Each bid can be awarded once.");
      const planned: { bidId: string; orgId: string; reason: string; lines: { tenderLineId: string; sharePercent: number }[] }[] = [];
      for (const a of dto.awards) {
        const row = res.rows.find((r) => r.bidId === a.bidId);
        if (!row) { problems.push("A selected bid is not a submitted bid on this tender."); continue; }
        const label = row.organizationName ?? "A bidder";
        if (!row.compliant) { problems.push(`${label} did not pass every gate and cannot be awarded.`); continue; }
        const screening = await tx.tenderScreening.findFirst({ where: { tenderId, screenedOrganisationId: row.organizationId }, orderBy: { recordedAt: "desc" } });
        if (!screening) problems.push(`Record a sanctions and debarment screening for ${label} before awarding (Screening tab).`);
        else if (screening.outcome === "EXCLUDED") problems.push(`${label} was recorded as excluded after screening and cannot be awarded.`);
        const lines = a.lines?.length ? a.lines : row.pricedLineIds.map((id) => ({ tenderLineId: id, sharePercent: 100 }));
        if (lines.length === 0) problems.push(`${label} has no priced items to award.`);
        for (const l of lines) if (!row.pricedLineIds.includes(l.tenderLineId)) problems.push(`${label} did not price one of the items selected for them.`);
        planned.push({ bidId: a.bidId, orgId: row.organizationId, reason: a.reason, lines });
      }
      const hasLots = res.lots.length > 0;
      if (hasLots && planned.some((p) => p.lines.some((l) => l.sharePercent !== 100))) problems.push("On a tender with lots, each item goes to one supplier in full (100%). Split shares are not used.");
      const over = overAllocatedLines(planned.flatMap((p) => p.lines));
      if (over.length) problems.push("An item has been allocated more than 100% across suppliers.");
      if (dto.waiveStandstill && !(t.standstillEnabled && t.emergencyProcurement)) problems.push("The standstill can only be waived on an emergency procurement that has a standstill.");
      if (problems.length) throw new BadRequestException({ message: "The award cannot be recorded yet.", problems });

      const now = new Date();
      const standstillEndsAt = t.standstillEnabled && !dto.waiveStandstill ? addWorkingDays(now, t.standstillWorkingDays ?? 8) : null;
      for (const p of planned) {
        const aw = await tx.tenderAward.create({ data: { organizationId: user.organizationId, tenderId, bidId: p.bidId, awardedOrganizationId: p.orgId, reason: p.reason, awardedById: user.id } });
        for (const l of p.lines) await tx.tenderAwardLine.create({ data: { organizationId: user.organizationId, awardedOrganizationId: p.orgId, tenderId, awardId: aw.id, tenderLineId: l.tenderLineId, sharePercent: l.sharePercent } });
      }
      // debriefs for every submitted bidder: a snapshot of their own scores
      const [gates, moderated] = await Promise.all([
        tx.tenderBidGate.findMany({ where: { tenderId } }), tx.tenderModeratedScore.findMany({ where: { tenderId } }),
      ]);
      const compliantCount = res.rows.filter((r) => r.compliant).length;
      for (const r of res.rows) {
        const awarded = planned.some((p) => p.bidId === r.bidId);
        const scores = res.criteria.map((c) => {
          const g = gates.find((x) => x.bidId === r.bidId && x.criterionId === c.id);
          const m = moderated.find((x) => x.bidId === r.bidId && x.criterionId === c.id);
          return { criterionId: c.id, title: c.title, kind: c.kind, weight: num(c.weight), metric: c.metric, score: m ? num(m.score) : null, passed: g ? g.passed : null, comment: c.kind === "GATE" ? g?.notes ?? null : m?.rationale ?? null };
        });
        const lotsOut = res.lots.map((lot) => {
          const mine = lot.rows.find((x) => x.bidId === r.bidId);
          if (!mine) return { lotNumber: lot.lotNumber, lotTitle: lot.lotTitle, bid: false };
          const won = planned.find((p) => p.bidId === r.bidId)?.lines.filter((l) => lot.lineIds.includes(l.tenderLineId)).length ?? 0;
          return { lotNumber: lot.lotNumber, lotTitle: lot.lotTitle, bid: true, rank: mine.rank, of: lot.rows.filter((x) => x.rank !== null).length, totalScore: mine.totalScore, itemsAwarded: won, itemsInLot: lot.lineIds.length };
        });
        await tx.tenderDebrief.create({ data: {
          lotsJson: lotsOut.length ? JSON.stringify(lotsOut) : null,
          organizationId: user.organizationId, tenderId, bidId: r.bidId, bidderOrganizationId: r.organizationId, outcome: awarded ? "AWARDED" : r.compliant ? "NOT_AWARDED" : "NOT_COMPLIANT",
          totalScore: r.totalScore, rank: r.compliant ? (r as { rank: number | null }).rank : null, bidCount: compliantCount, scoresJson: JSON.stringify(scores),
          feedback: dto.feedback?.find((f) => f.bidId === r.bidId)?.text || null,
        } });
      }
      await tx.tender.update({ where: { id: tenderId }, data: { status: "AWARDED", awardedAt: now, standstillEndsAt } });
      return { t, planned, standstillEndsAt, allOrgIds: res.rows.map((r) => r.organizationId), rows: res.rows.map((r) => ({ organizationId: r.organizationId, compliant: r.compliant })) };
    });
    for (const p of out.planned) {
      await appendTenderEvent({ organizationId: out.t.organizationId, counterpartyOrganizationId: p.orgId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "AWARD_MADE", summary: "An award was made", details: { bidId: p.bidId, lines: p.lines.length } });
    }
    await appendTenderEvent({ organizationId: out.t.organizationId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "DEBRIEFS_RELEASED", summary: `Award recorded (${out.planned.length} supplier${out.planned.length === 1 ? "" : "s"}); outcomes released to ${out.allOrgIds.length} bidder${out.allOrgIds.length === 1 ? "" : "s"}` });
    await this.bidProjects.onAward(tenderId, out.planned.map((p) => ({ organizationId: p.orgId, lines: p.lines })), out.rows.map((r) => ({ organizationId: r.organizationId, outcome: r.compliant ? "NOT_AWARDED" as const : "NOT_COMPLIANT" as const })));
    const awardedOrgs = new Set(out.planned.map((p) => p.orgId));
    await this.tenders.notifyOrgs(out.allOrgIds, (orgId) => ({ title: awardedOrgs.has(orgId) ? `Awarded: ${out.t.referenceNumber}` : `Outcome available: ${out.t.referenceNumber}`, body: awardedOrgs.has(orgId) ? `Your bid on ${out.t.title} has been successful.${out.standstillEndsAt ? " A standstill period applies before contract signature." : ""}` : `The award decision on ${out.t.title} has been made. Your debrief is available.`, link: `/bids/status?id=${tenderId}`, subjectId: tenderId }), "TENDER_AWARD", user.id);
    return this.evaluation.overview(user, tenderId);
  }

  async updateFeedback(user: RequestUser, tenderId: string, bidId: string, feedback: string) {
    assertHasPermission(user, "tenders.issue");
    await withTenantContext(user.organizationId, async (tx) => {
      await this.tenders.ownTender(tx, user, tenderId);
      const d = await tx.tenderDebrief.findUnique({ where: { tenderId_bidId: { tenderId, bidId } } });
      if (!d) throw new NotFoundException("Debrief not found.");
      await tx.tenderDebrief.update({ where: { id: d.id }, data: { feedback: feedback || null } });
    });
    return { updated: true };
  }

  // ---------------------------------------------------------- complaints

  async lodgeComplaint(user: RequestUser, tenderId: string, body: string) {
    assertHasPermission(user, "tenders.bid");
    const t = await withTenantContext(user.organizationId, async (tx) => {
      const t = await tx.tender.findUnique({ where: { id: tenderId } });
      if (!t || !t.isPublished) throw new NotFoundException("Tender not found.");
      const bid = await tx.tenderBid.findUnique({ where: { tenderId_organizationId: { tenderId, organizationId: user.organizationId } } });
      if (!bid || bid.status !== "SUBMITTED") throw new ForbiddenException("Only organisations that submitted a bid can lodge a complaint.");
      if (!t.awardedAt) throw new ConflictException("There is no award decision to challenge yet.");
      if (!t.standstillEndsAt || t.standstillEndsAt.getTime() < Date.now()) throw new ConflictException("The standstill period for this tender is not running. Contact the tender owner directly.");
      await tx.tenderComplaint.create({ data: { organizationId: user.organizationId, issuerOrganizationId: t.organizationId, tenderId, body, lodgedById: user.id } });
      return t;
    });
    await appendTenderEvent({ organizationId: t.organizationId, counterpartyOrganizationId: user.organizationId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "COMPLAINT_LODGED", summary: "A bidder lodged a complaint during the standstill" });
    await this.tenders.notifyIssuer(t, user, "TENDER_COMPLAINT", `Complaint on ${t.referenceNumber}`, `A bidder has lodged a complaint during the standstill on ${t.title}. Respond before the standstill ends.`);
    return { lodged: true };
  }

  async respondComplaint(user: RequestUser, tenderId: string, complaintId: string, status: string, response: string) {
    assertHasPermission(user, "tenders.issue");
    const c = await withTenantContext(user.organizationId, async (tx) => {
      await this.tenders.ownTender(tx, user, tenderId);
      const c = await tx.tenderComplaint.findFirst({ where: { id: complaintId, tenderId } });
      if (!c) throw new NotFoundException("Complaint not found.");
      if (c.status !== "OPEN") throw new ConflictException("This complaint has already been answered.");
      await tx.tenderComplaint.update({ where: { id: c.id }, data: { status, response, respondedAt: new Date() } });
      return c;
    });
    await appendTenderEvent({ organizationId: user.organizationId, counterpartyOrganizationId: c.organizationId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "COMPLAINT_RESPONDED", summary: `A complaint was ${status.toLowerCase()}` });
    await this.tenders.notifyOrgs([c.organizationId], () => ({ title: "Your complaint has been answered", body: "The tender owner has responded to your complaint.", link: `/bids/status?id=${tenderId}`, subjectId: tenderId }), "TENDER_COMPLAINT", user.id);
    return { responded: true };
  }

  // ---------------------------------------------------------- participant status

  /** Where the tender has got to, for anyone taking part. Milestones and a count only; never who else bid. */
  async participantStatus(user: RequestUser, tenderId: string) {
    assertHasPermission(user, "tenders.view");
    const own = await withTenantContext(user.organizationId, async (tx) => {
      const t = await tx.tender.findUnique({ where: { id: tenderId }, include: { organization: { select: { name: true } } } });
      if (!t || !t.isPublished || t.archivedAt) throw new NotFoundException("Tender not found.");
      const [part, bid, debrief, awards, awardLines, complaints] = await Promise.all([
        tx.tenderParticipation.findUnique({ where: { tenderId_organizationId: { tenderId, organizationId: user.organizationId } } }),
        tx.tenderBid.findUnique({ where: { tenderId_organizationId: { tenderId, organizationId: user.organizationId } } }),
        tx.tenderDebrief.findFirst({ where: { tenderId, bidderOrganizationId: user.organizationId } }),
        tx.tenderAward.findMany({ where: { tenderId, awardedOrganizationId: user.organizationId } }),
        tx.tenderAwardLine.findMany({ where: { tenderId, awardedOrganizationId: user.organizationId } }),
        tx.tenderComplaint.findMany({ where: { tenderId, organizationId: user.organizationId }, orderBy: { lodgedAt: "desc" } }),
      ]);
      const lines = await tx.tenderLine.findMany({ where: { id: { in: awardLines.map((l) => l.tenderLineId) } } });
      return { t, part, bid, debrief, awards, awardLines, lines, complaints };
    });
    const { t } = own;
    if (!(own.part && !own.part.withdrawnAt) && !own.bid) throw new ForbiddenException("This page is for organisations taking part in the tender.");
    const closed = !!t.closingAt && t.closingAt.getTime() <= Date.now();
    const bidsSubmitted = closed ? await withPlatformStaffContext((tx) => tx.tenderBid.count({ where: { tenderId, status: "SUBMITTED" } })) : null;
    const now = Date.now();
    const m = (key: string, label: string, at: Date | null, target: Date | null, doneAfter?: Date | null) => ({ key, label, at, target, done: !!at && (doneAfter === undefined ? true : at.getTime() <= now) });
    const milestones = [
      m("PUBLISHED", "Tender published", t.publishedAt, null),
      m("CLOSING", "Closing time", t.closingAt, null, t.closingAt),
      { key: "BIDS_OPENED", label: "Bids opened", at: t.bidsOpenedAt, target: t.closingAt, done: !!t.bidsOpenedAt },
      { key: "EVALUATION", label: "Evaluation under way", at: t.evaluationStartedAt, target: null as Date | null, done: !!t.evaluationStartedAt },
      { key: "SCORING", label: "Scoring complete", at: t.scoringFinalisedAt, target: t.evaluationDueAt, done: !!t.scoringFinalisedAt },
      { key: "AWARD", label: "Award decision", at: t.awardedAt, target: t.awardDueAt, done: !!t.awardedAt },
      ...(t.standstillEnabled ? [{ key: "STANDSTILL", label: "Standstill period ends", at: t.standstillEndsAt, target: null as Date | null, done: !!t.standstillEndsAt && t.standstillEndsAt.getTime() <= now }] : []),
    ];
    const next = t.status === "CANCELLED" ? null : milestones.find((x) => !x.done) ?? null;
    return {
      tender: { tenderType: t.tenderType, id: t.id, referenceNumber: t.referenceNumber, title: t.title, issuerName: t.organization.name, status: effectiveStatus(t), closingAt: t.closingAt, timeZone: t.timeZone, currency: t.currency, emergencyProcurement: t.emergencyProcurement, emergencyReason: t.emergencyReason, standstillEnabled: t.standstillEnabled, standstillEndsAt: t.standstillEndsAt, cancelledReason: t.cancelledReason },
      milestones, next: next ? { label: next.label, at: next.at ?? next.target } : null,
      bidsSubmitted,
      my: {
        participating: !!own.part && !own.part.withdrawnAt,
        bid: own.bid ? { status: own.bid.status, submittedAt: own.bid.submittedAt, bidCurrency: own.bid.bidCurrency, totalTenderCurrency: num(own.bid.totalTenderCurrency) } : null,
        debrief: own.debrief ? { lots: own.debrief.lotsJson ? JSON.parse(own.debrief.lotsJson) as unknown[] : [], outcome: own.debrief.outcome, totalScore: num(own.debrief.totalScore), rank: own.debrief.rank, bidCount: own.debrief.bidCount, scores: JSON.parse(own.debrief.scoresJson) as unknown[], feedback: own.debrief.feedback, releasedAt: own.debrief.releasedAt } : null,
        awards: own.awards.map((a) => ({ reason: a.reason, awardedAt: a.awardedAt, lines: own.awardLines.filter((l) => l.awardId === a.id).map((l) => ({ description: own.lines.find((x) => x.id === l.tenderLineId)?.description ?? "", sharePercent: num(l.sharePercent) })) })),
        complaints: own.complaints.map((c) => ({ id: c.id, body: c.body, status: c.status, response: c.response, lodgedAt: c.lodgedAt, respondedAt: c.respondedAt })),
        canComplain: !!own.bid && own.bid.status === "SUBMITTED" && !!t.standstillEndsAt && t.standstillEndsAt.getTime() > now,
      },
    };
  }
}
