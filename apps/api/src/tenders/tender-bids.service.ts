import { randomUUID } from "node:crypto";
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { withPlatformStaffContext, withTenantContext } from "@universe/db";
import type { Prisma } from "@universe/db";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";
import { BlobStorageService } from "../documents/blob-storage.service";
import { ExchangeRatesService } from "../exchange-rates/exchange-rates.service";
import { checkBid, crossRate, round2 } from "./bid-completeness";
import { buildFinancialTemplate, buildTechnicalTemplate, parseFinancialTemplate, parseTechnicalTemplate, stampFor } from "./bid-template";
import { evaluateEligibility } from "./eligibility";
import type { BidSaveDto, ConfirmBidFileDto, RequestBidFileDto, TemplateUploadDto } from "./dto/tenders.dto";
import { appendTenderEvent } from "./tender-events";
import { effectiveStatus, TendersService } from "./tenders.service";

type Tx = Prisma.TransactionClient;
const dec = (v: { toString(): string } | null | undefined) => (v === null || v === undefined ? null : v.toString());
const safeName = (n: string) => n.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-120);

/**
 * Bids on tenders (step 3, 2026-10-19). A bid belongs to the bidding organisation; the issuer is the counterparty. Bids stay sealed
 * until the closing time: before it the issuer cannot list or open them, only the bidder can. (The database lets the issuer read
 * its counterparty rows at any time; the closing-time rule is enforced here.) Prices are given in the bidder's own currency and
 * converted to the tender currency at submission using the latest daily reference rate, which is stored with the bid.
 */
@Injectable()
export class TenderBidsService {
  constructor(
    private readonly tenders: TendersService,
    private readonly fx: ExchangeRatesService,
    private readonly blob: BlobStorageService,
  ) {}

  // ----------------------------------------------------------- bidder side

  /** The tender, the bidder's standing on it, and a guard that bids are still being accepted. */
  private async bidContext(tx: Tx, user: RequestUser, tenderId: string) {
    const t = await tx.tender.findUnique({ where: { id: tenderId } });
    if (!t || !t.isPublished || t.archivedAt || t.organizationId === user.organizationId) throw new NotFoundException("Tender not found.");
    const [part, rules, invite, profile] = await Promise.all([
      tx.tenderParticipation.findUnique({ where: { tenderId_organizationId: { tenderId, organizationId: user.organizationId } } }),
      tx.tenderEligibilityRule.findMany({ where: { tenderId } }),
      tx.tenderInvitation.findFirst({ where: { tenderId, invitedOrganizationId: user.organizationId } }),
      this.tenders.loadProfile(tx, user.organizationId),
    ]);
    const eligibility = evaluateEligibility(rules, profile, { invited: !!invite });
    const participating = !!part && !part.withdrawnAt;
    const open = effectiveStatus(t) === "PUBLISHED";
    return { t, participating, eligibility, open };
  }

  private async assertCanBid(tx: Tx, user: RequestUser, tenderId: string) {
    const c = await this.bidContext(tx, user, tenderId);
    if (!c.open) throw new ConflictException("This tender is no longer accepting bids.");
    if (!c.participating) throw new ConflictException("Express interest in this tender before you start a bid.");
    if (!c.eligibility.canBid) throw new ForbiddenException("Your organisation does not currently meet this tender's requirements.");
    return c;
  }

  async getWorkspace(user: RequestUser, tenderId: string) {
    assertHasPermission(user, "tenders.bid");
    return withTenantContext(user.organizationId, async (tx) => {
      const c = await this.bidContext(tx, user, tenderId);
      if (!c.participating) throw new ConflictException("Express interest in this tender before you start a bid.");
      return this.buildWorkspace(tx, user, c);
    });
  }

  private async buildWorkspace(tx: Tx, user: RequestUser, c: Awaited<ReturnType<TenderBidsService["bidContext"]>>) {
    const t = c.t;
    const [issuer, lines, criteria, addenda, acks, bid] = await Promise.all([
      tx.organization.findUnique({ where: { id: t.organizationId }, select: { name: true } }),
      tx.tenderLine.findMany({ where: { tenderId: t.id }, orderBy: { lineNumber: "asc" } }),
      tx.tenderCriterion.findMany({ where: { tenderId: t.id, metric: "MANUAL" }, orderBy: { sortOrder: "asc" } }),
      tx.tenderAddendum.findMany({ where: { tenderId: t.id }, orderBy: { number: "asc" } }),
      tx.tenderAddendumAck.findMany({ where: { tenderId: t.id, organizationId: user.organizationId } }),
      tx.tenderBid.findUnique({ where: { tenderId_organizationId: { tenderId: t.id, organizationId: user.organizationId } } }),
    ]);
    const [bidLines, responses, files] = bid
      ? await Promise.all([
          tx.tenderBidLine.findMany({ where: { bidId: bid.id } }),
          tx.tenderBidResponse.findMany({ where: { bidId: bid.id } }),
          tx.tenderBidFile.findMany({ where: { bidId: bid.id }, orderBy: { uploadedAt: "asc" } }),
        ])
      : [[], [], []];
    const wsLines = lines.map((l) => {
      const b = bidLines.find((x) => x.tenderLineId === l.id);
      return {
        tenderLineId: l.id, lineNumber: l.lineNumber, description: l.description, quantity: dec(l.quantity), unit: l.unit, destinationCountryCode: l.destinationCountryCode,
        requiredRegistration: l.requiredRegistration, minShelfLifePercent: l.minShelfLifePercent, coldChainRequired: l.coldChainRequired, specification: l.specification,
        noBid: b?.noBid ?? false, unitPrice: dec(b?.unitPrice), leadTimeDays: b?.leadTimeDays ?? null, countryOfOrigin: b?.countryOfOrigin ?? null, manufacturerName: b?.manufacturerName ?? null, remarks: b?.remarks ?? null,
      };
    });
    const wsCriteria = criteria.map((cr) => ({
      id: cr.id, title: cr.title, description: cr.description, kind: cr.kind as "GATE" | "SCORED", weight: dec(cr.weight), isMandatory: cr.isMandatory, responseFormat: cr.responseFormat as "UPLOAD" | "TEXT" | "EITHER",
      text: responses.find((r) => r.criterionId === cr.id)?.text ?? null,
      files: files.filter((f) => f.criterionId === cr.id).map((f) => ({ id: f.id, fileName: f.fileName, fileSizeBytes: f.fileSizeBytes, criterionId: f.criterionId })),
    }));
    const ackSet = new Set(acks.map((a) => a.addendumId));
    const wsAddenda = addenda.map((a) => ({ id: a.id, number: a.number, title: a.title, requiresAcknowledgement: a.requiresAcknowledgement, acknowledged: ackSet.has(a.id) }));
    const checklist = checkBid({
      allowTextSubmission: t.allowTextSubmission, bidValidityDays: t.bidValidityDays, bidCurrency: bid?.bidCurrency ?? null, validityConfirmed: bid?.validityConfirmed ?? false,
      lines: wsLines.map((l) => ({ noBid: l.noBid, unitPrice: l.unitPrice === null ? null : Number(l.unitPrice), leadTimeDays: l.leadTimeDays, countryOfOrigin: l.countryOfOrigin })),
      criteria: wsCriteria.map((x) => ({ title: x.title, isMandatory: x.isMandatory, responseFormat: x.responseFormat, text: x.text, fileCount: x.files.length })),
      addenda: wsAddenda,
    });
    const status = (bid?.status ?? "NONE") as "NONE" | "DRAFT" | "SUBMITTED" | "WITHDRAWN";
    const open = c.open && c.eligibility.canBid;
    return {
      tender: { id: t.id, referenceNumber: t.referenceNumber, title: t.title, issuerName: issuer?.name ?? "", status: effectiveStatus(t), closingAt: t.closingAt, timeZone: t.timeZone, currency: t.currency, bidValidityDays: t.bidValidityDays, acceptedFileTypes: t.acceptedFileTypes, maxFileSizeMb: t.maxFileSizeMb, allowTextSubmission: t.allowTextSubmission, allowTemplateSubmission: t.allowTemplateSubmission },
      bid: { id: bid?.id ?? null, status, bidCurrency: bid?.bidCurrency ?? null, validityConfirmed: bid?.validityConfirmed ?? false, notes: bid?.notes ?? null, submittedAt: bid?.submittedAt ?? null, fxRate: dec(bid?.fxRate), fxRateDate: bid?.fxRateDate ?? null, totalBidCurrency: dec(bid?.totalBidCurrency), totalTenderCurrency: dec(bid?.totalTenderCurrency) },
      lines: wsLines, criteria: wsCriteria, addenda: wsAddenda, checklist, open, canSubmit: open && status !== "SUBMITTED" && checklist.every((x) => x.ok),
    };
  }

  /** Saves the draft. Saving a submitted bid before closing puts it back to draft: it must be submitted again. */
  async saveBid(user: RequestUser, tenderId: string, dto: BidSaveDto) {
    assertHasPermission(user, "tenders.bid");
    const ws = await withTenantContext(user.organizationId, async (tx) => {
      const c = await this.assertCanBid(tx, user, tenderId);
      const tenderLines = await tx.tenderLine.findMany({ where: { tenderId }, select: { id: true } });
      const criteria = await tx.tenderCriterion.findMany({ where: { tenderId }, select: { id: true } });
      const lineIds = new Set(tenderLines.map((l) => l.id)), critIds = new Set(criteria.map((x) => x.id));
      for (const l of dto.lines ?? []) if (!lineIds.has(l.tenderLineId)) throw new BadRequestException("A price refers to an item that is not on this tender.");
      for (const r of dto.responses ?? []) if (!critIds.has(r.criterionId)) throw new BadRequestException("An answer refers to a criterion that is not on this tender.");
      const base = { issuerOrganizationId: c.t.organizationId };
      const bid = await tx.tenderBid.upsert({
        where: { tenderId_organizationId: { tenderId, organizationId: user.organizationId } },
        create: { organizationId: user.organizationId, ...base, tenderId, createdById: user.id, bidCurrency: dto.bidCurrency?.toUpperCase() ?? c.t.currency, validityConfirmed: !!dto.validityConfirmed, validityDays: dto.validityConfirmed ? c.t.bidValidityDays : null, notes: dto.notes ?? null },
        update: {
          status: "DRAFT", submittedAt: null, withdrawnAt: null, fxRate: null, fxRateDate: null, totalBidCurrency: null, totalTenderCurrency: null,
          ...(dto.bidCurrency !== undefined ? { bidCurrency: dto.bidCurrency ? dto.bidCurrency.toUpperCase() : null } : {}),
          ...(dto.validityConfirmed !== undefined ? { validityConfirmed: dto.validityConfirmed, validityDays: dto.validityConfirmed ? c.t.bidValidityDays : null } : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        },
      });
      for (const l of dto.lines ?? []) {
        const data = { noBid: !!l.noBid, unitPrice: l.noBid ? null : l.unitPrice ?? null, leadTimeDays: l.noBid ? null : l.leadTimeDays ?? null, countryOfOrigin: l.noBid ? null : l.countryOfOrigin?.toUpperCase() ?? null, manufacturerName: l.noBid ? null : l.manufacturerName ?? null, remarks: l.remarks ?? null };
        await tx.tenderBidLine.upsert({ where: { bidId_tenderLineId: { bidId: bid.id, tenderLineId: l.tenderLineId } }, create: { organizationId: user.organizationId, ...base, bidId: bid.id, tenderId, tenderLineId: l.tenderLineId, ...data }, update: data });
      }
      for (const r of dto.responses ?? []) {
        await tx.tenderBidResponse.upsert({ where: { bidId_criterionId: { bidId: bid.id, criterionId: r.criterionId } }, create: { organizationId: user.organizationId, ...base, bidId: bid.id, tenderId, criterionId: r.criterionId, text: r.text ?? null }, update: { text: r.text ?? null } });
      }
      return this.buildWorkspace(tx, user, c);
    });
    return ws;
  }

  /** Step 1 of an upload: a short-lived write-only link into the bidder's own storage. Nothing is recorded until confirmFile. */
  async requestFileUpload(user: RequestUser, tenderId: string, dto: RequestBidFileDto) {
    assertHasPermission(user, "tenders.bid");
    const t = await withTenantContext(user.organizationId, async (tx) => (await this.assertCanBid(tx, user, tenderId)).t);
    const ext = dto.fileName.split(".").pop()?.toLowerCase() ?? "";
    const allowed = (t.acceptedFileTypes ?? "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    if (allowed.length && !allowed.includes(ext)) throw new BadRequestException(`This tender accepts ${allowed.join(", ")} files.`);
    if (t.maxFileSizeMb && dto.fileSizeBytes > t.maxFileSizeMb * 1024 * 1024) throw new BadRequestException(`Files can be up to ${t.maxFileSizeMb} MB.`);
    return this.blob.getUploadUrl(user.organizationId, `tender-bids/${tenderId}/${randomUUID()}-${safeName(dto.fileName)}`, dto.contentType);
  }

  async confirmFile(user: RequestUser, tenderId: string, dto: ConfirmBidFileDto) {
    assertHasPermission(user, "tenders.bid");
    return withTenantContext(user.organizationId, async (tx) => {
      const c = await this.assertCanBid(tx, user, tenderId);
      if (!dto.blobName.startsWith(`tender-bids/${tenderId}/`)) throw new BadRequestException("That file does not belong to this tender.");
      if (dto.criterionId && !(await tx.tenderCriterion.findFirst({ where: { id: dto.criterionId, tenderId } }))) throw new BadRequestException("That criterion is not on this tender.");
      const bid = await tx.tenderBid.upsert({
        where: { tenderId_organizationId: { tenderId, organizationId: user.organizationId } },
        create: { organizationId: user.organizationId, issuerOrganizationId: c.t.organizationId, tenderId, createdById: user.id, bidCurrency: c.t.currency },
        update: { status: "DRAFT", submittedAt: null, withdrawnAt: null, fxRate: null, fxRateDate: null, totalBidCurrency: null, totalTenderCurrency: null },
      });
      await tx.tenderBidFile.create({ data: { organizationId: user.organizationId, issuerOrganizationId: c.t.organizationId, bidId: bid.id, tenderId, criterionId: dto.criterionId ?? null, fileName: dto.fileName, blobName: dto.blobName, mimeType: dto.mimeType ?? null, fileSizeBytes: dto.fileSizeBytes ?? null, uploadedById: user.id } });
      return this.buildWorkspace(tx, user, c);
    });
  }

  async removeFile(user: RequestUser, tenderId: string, fileId: string) {
    assertHasPermission(user, "tenders.bid");
    return withTenantContext(user.organizationId, async (tx) => {
      const c = await this.assertCanBid(tx, user, tenderId);
      const f = await tx.tenderBidFile.findFirst({ where: { id: fileId, tenderId, organizationId: user.organizationId } });
      if (!f) throw new NotFoundException("File not found.");
      await tx.tenderBidFile.delete({ where: { id: fileId } });
      await tx.tenderBid.update({ where: { id: f.bidId }, data: { status: "DRAFT", submittedAt: null } });
      return this.buildWorkspace(tx, user, c);
    });
  }

  async myFileUrl(user: RequestUser, tenderId: string, fileId: string) {
    assertHasPermission(user, "tenders.bid");
    const f = await withTenantContext(user.organizationId, (tx) => tx.tenderBidFile.findFirst({ where: { id: fileId, tenderId, organizationId: user.organizationId } }));
    if (!f) throw new NotFoundException("File not found.");
    return { downloadUrl: await this.blob.getDownloadUrl(user.organizationId, f.blobName) };
  }

  // ------------------------------------------------- locked templates (alternative to the online form)

  private async templateData(user: RequestUser, tenderId: string) {
    return withTenantContext(user.organizationId, async (tx) => {
      const c = await this.assertCanBid(tx, user, tenderId);
      if (!c.t.allowTemplateSubmission) throw new ConflictException("This tender does not accept template submissions. Use the online form.");
      if (!c.t.currency) throw new ConflictException("This tender has no currency set.");
      const [issuer, lines, criteria, countries] = await Promise.all([
        tx.organization.findUnique({ where: { id: c.t.organizationId }, select: { name: true } }),
        tx.tenderLine.findMany({ where: { tenderId }, orderBy: { lineNumber: "asc" } }),
        tx.tenderCriterion.findMany({ where: { tenderId, metric: "MANUAL" }, orderBy: { sortOrder: "asc" } }),
        tx.country.findMany({ orderBy: { name: "asc" }, select: { code: true, name: true } }),
      ]);
      const t = c.t;
      const closingText = t.closingAt ? `${t.closingAt.toISOString().slice(0, 16).replace("T", " ")} UTC` : "the closing time";
      return {
        tender: { id: t.id, referenceNumber: t.referenceNumber, title: t.title, issuerName: issuer?.name ?? "", currency: t.currency!, bidValidityDays: t.bidValidityDays, closingText },
        lines: lines.map((l) => ({ id: l.id, lineNumber: l.lineNumber, description: l.description, quantity: dec(l.quantity), unit: l.unit })),
        criteria: criteria.map((x) => ({ id: x.id, title: x.title, description: x.description, kind: x.kind, weight: dec(x.weight), isMandatory: x.isMandatory, responseFormat: x.responseFormat })),
        countries, allowTextSubmission: t.allowTextSubmission,
      };
    });
  }

  /** A locked template generated from this tender's own items and criteria: Excel for the financial offer, Word for the technical offer. */
  async downloadTemplate(user: RequestUser, tenderId: string, kind: string) {
    assertHasPermission(user, "tenders.bid");
    if (kind !== "financial" && kind !== "technical") throw new BadRequestException("Unknown template.");
    const d = await this.templateData(user, tenderId);
    const ref = d.tender.referenceNumber.replace(/[^A-Za-z0-9-]+/g, "_");
    if (kind === "financial") {
      const buf = await buildFinancialTemplate(d.tender, d.lines, d.criteria, d.countries);
      return { fileName: `${ref}-financial-offer.xlsx`, contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", contentBase64: buf.toString("base64") };
    }
    if (!d.allowTextSubmission) throw new ConflictException("This tender takes technical answers as uploaded files only.");
    const buf = await buildTechnicalTemplate(d.tender, d.lines, d.criteria);
    return { fileName: `${ref}-technical-offer.docx`, contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", contentBase64: buf.toString("base64") };
  }

  /**
   * Reads a completed template into the draft bid. If anything is wrong the file is not accepted and nothing is changed:
   * the bidder gets the reasons and can amend and try again, or use the online form instead.
   */
  async uploadTemplate(user: RequestUser, tenderId: string, kind: string, dto: TemplateUploadDto) {
    assertHasPermission(user, "tenders.bid");
    if (kind !== "financial" && kind !== "technical") throw new BadRequestException("Unknown template.");
    const d = await this.templateData(user, tenderId);
    const buf = Buffer.from(dto.contentBase64, "base64");
    if (buf.length === 0 || buf.length > 3_000_000) return { accepted: false, problems: ["The file is empty or larger than 3 MB."], workspace: null };
    const stamp = stampFor(tenderId, d.lines, d.criteria);
    if (kind === "financial") {
      const r = await parseFinancialTemplate(buf, tenderId, stamp, d.lines.map((l) => l.id), new Set(d.countries.map((c) => c.code)));
      if (!r.data) return { accepted: false, problems: r.problems, workspace: null };
      const workspace = await this.saveBid(user, tenderId, { bidCurrency: d.tender.currency, validityConfirmed: r.data.validityConfirmed, notes: r.data.notes, lines: r.data.lines });
      return { accepted: true, problems: [], workspace };
    }
    const textIds = new Set(d.criteria.filter((c) => c.responseFormat !== "UPLOAD").map((c) => c.id));
    const r = await parseTechnicalTemplate(buf, tenderId, stamp, textIds);
    if (!r.data) return { accepted: false, problems: r.problems, workspace: null };
    const workspace = await this.saveBid(user, tenderId, { responses: r.data });
    return { accepted: true, problems: [], workspace };
  }

  async submitBid(user: RequestUser, tenderId: string) {
    assertHasPermission(user, "tenders.bid");
    const out = await withTenantContext(user.organizationId, async (tx) => {
      const c = await this.assertCanBid(tx, user, tenderId);
      const ws = await this.buildWorkspace(tx, user, c);
      if (ws.bid.status === "SUBMITTED") throw new ConflictException("This bid is already submitted.");
      const failing = ws.checklist.filter((x) => !x.ok);
      if (failing.length) throw new BadRequestException({ message: "Your bid is not complete yet.", problems: failing.map((x) => x.label) });
      const tenderCcy = c.t.currency!;
      const bidCcy = ws.bid.bidCurrency!;
      let rate = 1; let rateDate: Date = new Date();
      if (bidCcy !== tenderCcy) {
        const snap = await this.fx.getSnapshotForDate(new Date());
        const r = snap ? crossRate(snap.rates, bidCcy, tenderCcy) : null;
        if (!snap || r === null) throw new BadRequestException(`No exchange rate is available between ${bidCcy} and ${tenderCcy} right now. Price in ${tenderCcy}, or try again later.`);
        rate = r; rateDate = snap.date;
      }
      const total = ws.lines.filter((l) => !l.noBid).reduce((s, l) => s + Number(l.unitPrice ?? 0) * Number(l.quantity ?? 1), 0);
      const bid = await tx.tenderBid.update({
        where: { id: ws.bid.id! },
        data: { status: "SUBMITTED", submittedAt: new Date(), withdrawnAt: null, fxRate: rate, fxRateDate: rateDate, totalBidCurrency: round2(total), totalTenderCurrency: round2(total * rate) },
      });
      return { t: c.t, bid };
    });
    await appendTenderEvent({ organizationId: out.t.organizationId, counterpartyOrganizationId: user.organizationId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "BID_SUBMITTED", summary: "A bid was submitted" });
    await this.tenders.notifyIssuer(out.t, user, "TENDER_BID", `Bid received on ${out.t.referenceNumber}`, `A bid was submitted on ${out.t.title}. Bids stay sealed until the closing time.`);
    return { submitted: true, totalTenderCurrency: dec(out.bid.totalTenderCurrency), fxRate: dec(out.bid.fxRate), fxRateDate: out.bid.fxRateDate };
  }

  async withdrawBid(user: RequestUser, tenderId: string) {
    assertHasPermission(user, "tenders.bid");
    const t = await withTenantContext(user.organizationId, async (tx) => {
      const c = await this.bidContext(tx, user, tenderId);
      if (!c.open) throw new ConflictException("Bids cannot be withdrawn after the closing time.");
      const bid = await tx.tenderBid.findUnique({ where: { tenderId_organizationId: { tenderId, organizationId: user.organizationId } } });
      if (!bid || bid.status === "WITHDRAWN" || bid.status === "DRAFT") throw new ConflictException("There is no submitted bid to withdraw. A draft can simply be left or edited.");
      await tx.tenderBid.update({ where: { id: bid.id }, data: { status: "WITHDRAWN", withdrawnAt: new Date(), submittedAt: null } });
      return c.t;
    });
    await appendTenderEvent({ organizationId: t.organizationId, counterpartyOrganizationId: user.organizationId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "BID_WITHDRAWN", summary: "A bid was withdrawn" });
    return { withdrawn: true };
  }

  async myBids(user: RequestUser) {
    assertHasPermission(user, "tenders.bid");
    return withTenantContext(user.organizationId, async (tx) => {
      const bids = await tx.tenderBid.findMany({ where: { organizationId: user.organizationId }, orderBy: { updatedAt: "desc" } });
      const tenders = await tx.tender.findMany({ where: { id: { in: bids.map((b) => b.tenderId) } }, include: { organization: { select: { name: true } } } });
      return bids.flatMap((b) => {
        const t = tenders.find((x) => x.id === b.tenderId);
        if (!t) return [];
        return [{ tenderId: t.id, referenceNumber: t.referenceNumber, title: t.title, issuerName: t.organization.name, closingAt: t.closingAt, timeZone: t.timeZone, tenderStatus: effectiveStatus(t), status: b.status, submittedAt: b.submittedAt, bidCurrency: b.bidCurrency, totalBidCurrency: dec(b.totalBidCurrency) }];
      });
    });
  }

  // ----------------------------------------------------------- issuer side

  private async assertOpenedForIssuer(user: RequestUser, tenderId: string) {
    assertHasPermission(user, "tenders.issue");
    return withTenantContext(user.organizationId, async (tx) => {
      const t = await this.tenders.ownTender(tx, user, tenderId);
      if (t.status === "DRAFT") throw new ConflictException("This tender has not been published.");
      if (!t.closingAt || t.closingAt.getTime() > Date.now()) throw new ForbiddenException("Bids are sealed until the closing time.");
      return t;
    });
  }

  /** The issuer opens the bids at or after the closing time. Recorded once on the timeline and shown to participants as a milestone. */
  async openBids(user: RequestUser, tenderId: string) {
    const t = await this.assertOpenedForIssuer(user, tenderId);
    if (t.bidsOpenedAt) return { openedAt: t.bidsOpenedAt, alreadyOpen: true };
    const count = await withTenantContext(user.organizationId, async (tx) => {
      await tx.tender.update({ where: { id: tenderId }, data: { bidsOpenedAt: new Date() } });
      return tx.tenderBid.count({ where: { tenderId, issuerOrganizationId: user.organizationId, status: "SUBMITTED" } });
    });
    await appendTenderEvent({ organizationId: t.organizationId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "BIDS_OPENED", summary: `Bids opened (${count} submitted)`, details: { count } });
    const orgs = await withTenantContext(user.organizationId, (tx) => tx.tenderBid.findMany({ where: { tenderId, status: "SUBMITTED" }, select: { organizationId: true } }));
    await this.tenders.notifyOrgs(orgs.map((o) => o.organizationId), () => ({ title: `Bids opened: ${t.referenceNumber}`, body: `The bids for ${t.title} have been opened and evaluation will follow.`, link: `/bids/status?id=${tenderId}`, subjectId: tenderId }), "TENDER_BIDS_OPENED", user.id);
    return { openedAt: new Date(), alreadyOpen: false };
  }

  /** Number of submitted bids. Allowed before closing: it reveals nothing about their content. */
  async countSubmitted(user: RequestUser, tenderId: string) {
    assertHasPermission(user, "tenders.issue");
    return withTenantContext(user.organizationId, async (tx) => {
      await this.tenders.ownTender(tx, user, tenderId);
      return tx.tenderBid.count({ where: { tenderId, issuerOrganizationId: user.organizationId, status: "SUBMITTED" } });
    });
  }

  /** Opens the submitted bids once the closing time has passed. Every opening is written to the tender's timeline. */
  async listBids(user: RequestUser, tenderId: string) {
    const t = await this.assertOpenedForIssuer(user, tenderId);
    if (!t.bidsOpenedAt) throw new ConflictException("Open the bids first.");
    const result = await withTenantContext(user.organizationId, async (tx) => {
      const bids = await tx.tenderBid.findMany({ where: { tenderId, issuerOrganizationId: user.organizationId, status: "SUBMITTED" }, orderBy: { totalTenderCurrency: "asc" } });
      const ids = bids.map((b) => b.id);
      const [lines, tenderLines, responses, criteria, files, orgs] = await Promise.all([
        tx.tenderBidLine.findMany({ where: { bidId: { in: ids } } }),
        tx.tenderLine.findMany({ where: { tenderId }, orderBy: { lineNumber: "asc" } }),
        tx.tenderBidResponse.findMany({ where: { bidId: { in: ids } } }),
        tx.tenderCriterion.findMany({ where: { tenderId, metric: "MANUAL" }, orderBy: { sortOrder: "asc" } }),
        tx.tenderBidFile.findMany({ where: { bidId: { in: ids } } }),
        tx.organization.findMany({ where: { id: { in: bids.map((b) => b.organizationId) } }, select: { id: true, name: true } }),
      ]);
      return bids.map((b) => ({
        bidId: b.id, organizationId: b.organizationId, organizationName: orgs.find((o) => o.id === b.organizationId)?.name ?? null, submittedAt: b.submittedAt, bidCurrency: b.bidCurrency,
        fxRate: dec(b.fxRate), fxRateDate: b.fxRateDate, totalBidCurrency: dec(b.totalBidCurrency), totalTenderCurrency: dec(b.totalTenderCurrency), validityDays: b.validityDays, notes: b.notes,
        lines: tenderLines.map((tl) => { const l = lines.find((x) => x.bidId === b.id && x.tenderLineId === tl.id); return { tenderLineId: tl.id, lineNumber: tl.lineNumber, description: tl.description, quantity: dec(tl.quantity), unit: tl.unit, noBid: l?.noBid ?? true, unitPrice: dec(l?.unitPrice), leadTimeDays: l?.leadTimeDays ?? null, countryOfOrigin: l?.countryOfOrigin ?? null, manufacturerName: l?.manufacturerName ?? null, remarks: l?.remarks ?? null }; }),
        responses: criteria.map((c) => ({ criterionId: c.id, criterionTitle: c.title, text: responses.find((r) => r.bidId === b.id && r.criterionId === c.id)?.text ?? null, files: files.filter((f) => f.bidId === b.id && f.criterionId === c.id).map((f) => ({ id: f.id, fileName: f.fileName, fileSizeBytes: f.fileSizeBytes, criterionId: f.criterionId })) })),
      }));
    });
    await appendTenderEvent({ organizationId: t.organizationId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "BIDS_VIEWED", summary: `Submitted bids viewed (${result.length})`, details: { count: result.length } });
    return result;
  }

  async bidFileUrl(user: RequestUser, tenderId: string, fileId: string) {
    const t = await this.assertOpenedForIssuer(user, tenderId);
    if (!t.bidsOpenedAt) throw new ConflictException("Open the bids first.");
    const f = await withTenantContext(user.organizationId, async (tx) => {
      const file = await tx.tenderBidFile.findFirst({ where: { id: fileId, tenderId, issuerOrganizationId: user.organizationId } });
      if (!file) return null;
      const bid = await tx.tenderBid.findUnique({ where: { id: file.bidId } });
      return bid?.status === "SUBMITTED" ? file : null;
    });
    if (!f) throw new NotFoundException("File not found.");
    await appendTenderEvent({ organizationId: t.organizationId, tenderId, actorOrganizationId: user.organizationId, actorUserId: user.id, kind: "BID_FILE_VIEWED", summary: `A bid document was opened: ${f.fileName}` });
    return { downloadUrl: await this.blob.getDownloadUrl(f.organizationId, f.blobName) };
  }
}
