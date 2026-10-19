import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { withPlatformStaffContext, withTenantContext } from "@universe/db";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";
import { effectiveStatus, TendersService } from "./tenders.service";
import { appendTenderEvent, verifyChain } from "./tender-events";
import type { AddendumDto, AnswerQuestionDto, ClarificationDto, ScreeningDto } from "./dto/tenders.dto";

/**
 * Tender fairness and audit features (2026-10-19): published questions and answers, formal addenda with acknowledgement,
 * sanctions/debarment screening records, the tamper-evidence check, and the public notice feed. Evaluation conflict declarations
 * and scoring arrive with bids in step 4.
 */
@Injectable()
export class TenderComplianceService {
  constructor(private readonly tenders: TendersService) {}

  /** Organisations that should hear about a change to a tender: active participants and invited organisations. */
  private async audience(user: RequestUser, tenderId: string): Promise<string[]> {
    return withTenantContext(user.organizationId, async (tx) => {
      const [parts, invites] = await Promise.all([
        tx.tenderParticipation.findMany({ where: { tenderId, withdrawnAt: null }, select: { organizationId: true } }),
        tx.tenderInvitation.findMany({ where: { tenderId }, select: { invitedOrganizationId: true } }),
      ]);
      return [...new Set([...parts.map((p) => p.organizationId), ...invites.map((i) => i.invitedOrganizationId)])];
    });
  }

  // ---------------------------------------------------------------- questions (participant asks, issuer answers to everyone)

  async askQuestion(user: RequestUser, tenderId: string, question: string) {
    assertHasPermission(user, "tenders.bid");
    const t = await withTenantContext(user.organizationId, async (tx) => {
      const t = await tx.tender.findUnique({ where: { id: tenderId } });
      if (!t || !t.isPublished || t.organizationId === user.organizationId) throw new NotFoundException("Tender not found.");
      if (effectiveStatus(t) !== "PUBLISHED") throw new ConflictException("This tender is no longer open for questions.");
      if (t.clarificationDeadline && t.clarificationDeadline.getTime() < Date.now()) throw new ConflictException("The deadline for questions has passed.");
      await tx.tenderQuestion.create({ data: { organizationId: user.organizationId, issuerOrganizationId: t.organizationId, tenderId, question: question.trim(), askedById: user.id } });
      return t;
    });
    await appendTenderEvent({ organizationId: t.organizationId, counterpartyOrganizationId: user.organizationId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "QUESTION_ASKED", summary: "A question was submitted" });
    await this.tenders.notifyIssuer(t, user, "TENDER_QUESTION", `New question on ${t.referenceNumber}`, `A bidder has asked a question about ${t.title}.`);
    return { asked: true };
  }

  /** Answers a submitted question. The published text goes to every participant without saying who asked. */
  async answerQuestion(user: RequestUser, tenderId: string, questionId: string, dto: AnswerQuestionDto) {
    assertHasPermission(user, "tenders.issue");
    const t = await withTenantContext(user.organizationId, async (tx) => {
      const t = await this.tenders.ownTender(tx, user, tenderId);
      if (t.status !== "PUBLISHED") throw new ConflictException("Questions can only be answered while the tender is open.");
      const q = await tx.tenderQuestion.findFirst({ where: { id: questionId, tenderId, issuerOrganizationId: user.organizationId } });
      if (!q) throw new NotFoundException("Question not found.");
      if (await tx.tenderClarification.findFirst({ where: { sourceQuestionId: questionId } })) throw new ConflictException("This question has already been answered.");
      await tx.tenderClarification.create({ data: { organizationId: user.organizationId, tenderId, question: (dto.publishedQuestion ?? q.question).trim(), answer: dto.answer.trim(), sourceQuestionId: questionId, answeredById: user.id } });
      return t;
    });
    await this.published(user, t);
    return { answered: true };
  }

  /** The issuer publishes a clarification on its own initiative (no question asked). */
  async postClarification(user: RequestUser, tenderId: string, dto: ClarificationDto) {
    assertHasPermission(user, "tenders.issue");
    const t = await withTenantContext(user.organizationId, async (tx) => {
      const t = await this.tenders.ownTender(tx, user, tenderId);
      if (t.status !== "PUBLISHED") throw new ConflictException("Clarifications can only be published while the tender is open.");
      await tx.tenderClarification.create({ data: { organizationId: user.organizationId, tenderId, question: dto.question.trim(), answer: dto.answer.trim(), answeredById: user.id } });
      return t;
    });
    await this.published(user, t);
    return { published: true };
  }

  private async published(user: RequestUser, t: { id: string; organizationId: string; referenceNumber: string; title: string }) {
    await appendTenderEvent({ organizationId: t.organizationId, tenderId: t.id, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "CLARIFICATION_PUBLISHED", summary: "A clarification was published to all participants" });
    await this.tenders.notifyOrgs(await this.audience(user, t.id), () => ({ title: `Clarification on ${t.referenceNumber}`, body: `A question and answer were published for ${t.title}.`, link: `/tenders/detail?id=${t.id}`, subjectId: t.id }), "TENDER_CLARIFICATION", user.id);
  }

  // ---------------------------------------------------------------- addenda

  async createAddendum(user: RequestUser, tenderId: string, dto: AddendumDto) {
    assertHasPermission(user, "tenders.issue");
    const newClosing = dto.newClosingAt ? new Date(dto.newClosingAt) : null;
    const out = await withTenantContext(user.organizationId, async (tx) => {
      const t = await this.tenders.ownTender(tx, user, tenderId);
      if (t.status !== "PUBLISHED") throw new ConflictException("An addendum can only be issued while the tender is open.");
      if (newClosing && t.closingAt && newClosing <= t.closingAt) throw new BadRequestException("A new closing date can only be later than the current one.");
      const last = await tx.tenderAddendum.findFirst({ where: { tenderId }, orderBy: { number: "desc" }, select: { number: true } });
      const a = await tx.tenderAddendum.create({ data: { organizationId: user.organizationId, tenderId, number: (last?.number ?? 0) + 1, title: dto.title.trim(), body: dto.body.trim(), requiresAcknowledgement: dto.requiresAcknowledgement ?? true, newClosingAt: newClosing, createdById: user.id } });
      if (newClosing) await tx.tender.update({ where: { id: tenderId }, data: { closingAt: newClosing } });
      return { t, a };
    });
    await appendTenderEvent({ organizationId: out.t.organizationId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "ADDENDUM_ISSUED", summary: `Addendum ${out.a.number} issued: ${out.a.title}`, details: { number: out.a.number, newClosingAt: newClosing?.toISOString() ?? null } });
    await this.tenders.notifyOrgs(await this.audience(user, tenderId), () => ({ title: `Addendum ${out.a.number} to ${out.t.referenceNumber}`, body: `${out.a.title}${out.a.requiresAcknowledgement ? ". Please acknowledge it." : "."}`, link: `/tenders/detail?id=${tenderId}`, subjectId: tenderId }), "TENDER_ADDENDUM", user.id);
    return out.a;
  }

  async acknowledgeAddendum(user: RequestUser, tenderId: string, addendumId: string) {
    assertHasPermission(user, "tenders.bid");
    const t = await withTenantContext(user.organizationId, async (tx) => {
      const t = await tx.tender.findUnique({ where: { id: tenderId } });
      if (!t || !t.isPublished) throw new NotFoundException("Tender not found.");
      const part = await tx.tenderParticipation.findUnique({ where: { tenderId_organizationId: { tenderId, organizationId: user.organizationId } } });
      if (!part || part.withdrawnAt) throw new ConflictException("Only organisations that have expressed interest can acknowledge an addendum.");
      const a = await tx.tenderAddendum.findFirst({ where: { id: addendumId, tenderId } });
      if (!a) throw new NotFoundException("Addendum not found.");
      await tx.tenderAddendumAck.upsert({ where: { addendumId_organizationId: { addendumId, organizationId: user.organizationId } }, update: {}, create: { organizationId: user.organizationId, issuerOrganizationId: t.organizationId, tenderId, addendumId, acknowledgedById: user.id } });
      return { ...t, number: a.number };
    });
    await appendTenderEvent({ organizationId: t.organizationId, counterpartyOrganizationId: user.organizationId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "ADDENDUM_ACKNOWLEDGED", summary: `Addendum ${t.number} acknowledged` });
    return { acknowledged: true };
  }

  // ---------------------------------------------------------------- sanctions and debarment screening (issuer's own record)

  /** Records that the issuer screened an organisation. Universe does not perform the check; this is the audit entry that it was done. */
  async recordScreening(user: RequestUser, tenderId: string, dto: ScreeningDto) {
    assertHasPermission(user, "tenders.issue");
    if (dto.lists.length === 0) throw new BadRequestException("Choose at least one list you screened against.");
    const row = await withTenantContext(user.organizationId, async (tx) => {
      const t = await this.tenders.ownTender(tx, user, tenderId);
      const [part, invite] = await Promise.all([
        tx.tenderParticipation.findUnique({ where: { tenderId_organizationId: { tenderId, organizationId: dto.organisationId } } }),
        tx.tenderInvitation.findFirst({ where: { tenderId, invitedOrganizationId: dto.organisationId } }),
      ]);
      if (!part && !invite) throw new BadRequestException("Only participating or invited organisations can be screened on this tender.");
      const screenedOn = new Date(dto.screenedOn);
      if (screenedOn.getTime() > Date.now() + 86_400_000) throw new BadRequestException("The screening date cannot be in the future.");
      return tx.tenderScreening.create({ data: { organizationId: user.organizationId, tenderId: t.id, screenedOrganisationId: dto.organisationId, listsJson: JSON.stringify([...new Set(dto.lists)]), outcome: dto.outcome, notes: dto.notes?.trim() || null, screenedOn, recordedById: user.id } });
    });
    // Counterparty is deliberately left empty: the screened organisation must not see this entry.
    await appendTenderEvent({ organizationId: user.organizationId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "SCREENING_RECORDED", summary: `Screening recorded (${dto.outcome.toLowerCase().replace(/_/g, " ")})`, details: { screenedOrganisationId: dto.organisationId, lists: dto.lists, outcome: dto.outcome } });
    return row;
  }

  // ---------------------------------------------------------------- tamper-evidence

  async verifyTimeline(user: RequestUser, tenderId: string) {
    assertHasPermission(user, "tenders.issue");
    await withTenantContext(user.organizationId, (tx) => this.tenders.ownTender(tx, user, tenderId));
    const events = await withPlatformStaffContext((tx) => tx.tenderEvent.findMany({ where: { tenderId } }));
    return verifyChain(events.map((e) => ({ ...e, hash: e.hash, prevHash: e.prevHash })));
  }

  // ---------------------------------------------------------------- public notices (no sign-in)

  /** Read-only notices for tenders whose issuer switched the option on. Simulated tenders never appear. Only fields meant to be public are returned. */
  async publicNotices(id?: string) {
    return withPlatformStaffContext(async (tx) => {
      const tenders = await tx.tender.findMany({
        where: { publicNotice: true, isPublished: true, isSimulated: false, archivedAt: null, ...(id ? { id } : {}) },
        include: { organization: { select: { name: true } }, lines: { orderBy: { lineNumber: "asc" } }, criteria: { orderBy: { sortOrder: "asc" } } },
        orderBy: { publishedAt: "desc" }, take: id ? 1 : 200,
      });
      return tenders.map((t) => ({
        id: t.id, referenceNumber: t.referenceNumber, title: t.title, summary: t.summary, issuerName: t.organization.name, tenderType: t.tenderType,
        status: effectiveStatus(t), publishedAt: t.publishedAt, closingAt: t.closingAt, timeZone: t.timeZone, deliveryCountryCodes: t.deliveryCountryCodes,
        currency: t.currency, incoterm: t.incoterm,
        lines: t.lines.map((l) => ({ description: l.description, quantity: l.quantity === null ? null : String(l.quantity), unit: l.unit })),
        criteria: t.criteria.map((c) => ({ title: c.title, kind: c.kind, weight: c.weight === null ? null : String(c.weight) })),
      }));
    });
  }
}
