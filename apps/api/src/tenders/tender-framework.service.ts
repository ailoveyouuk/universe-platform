import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";
import type { ApprovalSettingsDto, PriceReviewDto, PriceReviewResponseDto, RaiseCallOffDto } from "./dto/tenders.dto";
import { addMonths, canGiveSecondApproval, ceilingCheck, chooseSupplier, DEFAULT_INDIVIDUAL_LIMIT, DEFAULT_SPLIT_WINDOW_DAYS, effectivePrice, holdActive, holdEndsAt, requiresSecondApproval } from "./tender-framework";
import { appendTenderEvent } from "./tender-events";
import { TendersService } from "./tenders.service";

type Tx = Parameters<Parameters<typeof withTenantContext>[1]>[0];
const num = (v: unknown) => (v == null ? null : Number(v));
const r2 = (n: number) => Math.round(n * 100) / 100;
const OPEN_STATUSES = ["PENDING_APPROVAL", "AWAITING_SUPPLIER", "ACCEPTED"];

/**
 * Framework agreements and call-offs (step 7 part 2, 2026-10-22). A framework tender awards contracts as usual; the contract is then the agreement.
 * Prices come from each supplier's own bid and are held for the tender's price-hold period from signature, after which either side may propose a
 * change to specific items and the other accepts or rejects it. The owner raises call-offs against the agreement: the supplier is chosen by the
 * tender's method (direct award to the first-ranked supplier, or rotation), the value is checked against the organisation's approval limit (one
 * authoriser up to it, a second and different authoriser above it), and the supplier accepts or declines. The ceiling is a guide: it warns and is
 * recorded, but never blocks. Every step is written to the tender's hash-chained timeline.
 */
@Injectable()
export class TenderFrameworkService {
  constructor(private readonly tenders: TendersService) {}

  private async event(t: { organizationId: string; id: string }, counterparty: string, user: RequestUser, kind: string, summary: string, details?: unknown) {
    await appendTenderEvent({ organizationId: t.organizationId, counterpartyOrganizationId: counterparty, tenderId: t.id, actorOrganizationId: user.organizationId, actorUserId: user.id, kind, summary, details });
  }

  // ------------------------------------------------------------------ settings

  async getSettings(user: RequestUser) {
    assertHasPermission(user, "tenders.award");
    return withTenantContext(user.organizationId, (tx) => this.settings(tx, user.organizationId));
  }
  private async settings(tx: Tx, orgId: string) {
    const s = await tx.tenderApprovalSettings.findUnique({ where: { organizationId: orgId } });
    return { individualLimit: num(s?.individualLimit) ?? DEFAULT_INDIVIDUAL_LIMIT, splitWindowDays: s?.splitWindowDays ?? DEFAULT_SPLIT_WINDOW_DAYS, confirmed: !!s?.confirmedAt, confirmedAt: s?.confirmedAt ?? null };
  }
  async saveSettings(user: RequestUser, dto: ApprovalSettingsDto) {
    assertHasPermission(user, "tenders.award");
    await withTenantContext(user.organizationId, async (tx) => {
      const data = { individualLimit: dto.individualLimit, splitWindowDays: dto.splitWindowDays, confirmedAt: new Date(), updatedById: user.id };
      await tx.tenderApprovalSettings.upsert({ where: { organizationId: user.organizationId }, create: { organizationId: user.organizationId, ...data }, update: data });
    });
    return this.getSettings(user);
  }

  // ------------------------------------------------------------------ reading

  /** The framework as the caller may see it. The owner sees every supplier, rank and the ceiling; a supplier sees only its own agreement and orders. */
  async view(user: RequestUser, tenderId: string) {
    assertHasPermission(user, "tenders.view");
    return withTenantContext(user.organizationId, async (tx) => {
      const t = await tx.tender.findUnique({ where: { id: tenderId } });
      if (!t || t.tenderType !== "FRAMEWORK") throw new NotFoundException("Framework not found.");
      const owner = t.organizationId === user.organizationId;
      const mine = owner ? {} : { awardedOrganizationId: user.organizationId };
      const [contracts, callOffs, reviews, lines, debriefs, awards] = await Promise.all([
        tx.tenderContract.findMany({ where: { tenderId, ...mine }, orderBy: { createdAt: "asc" } }),
        tx.tenderCallOff.findMany({ where: { tenderId, ...mine }, orderBy: { createdAt: "desc" } }),
        tx.tenderPriceReview.findMany({ where: { tenderId, ...mine }, orderBy: { createdAt: "desc" } }),
        tx.tenderLine.findMany({ where: { tenderId }, orderBy: { lineNumber: "asc" } }),
        owner ? tx.tenderDebrief.findMany({ where: { tenderId } }) : Promise.resolve([]),
        tx.tenderAward.findMany({ where: { tenderId, ...mine } }),
      ]);
      const coLines = await tx.tenderCallOffLine.findMany({ where: { callOffId: { in: callOffs.map((c) => c.id) } } });
      const names = new Map((await tx.organization.findMany({ where: { id: { in: [...new Set([t.organizationId, ...contracts.map((c) => c.awardedOrganizationId)])] } }, select: { id: true, name: true } })).map((o) => [o.id, o.name]));
      const settings = owner ? await this.settings(tx, user.organizationId) : null;
      const now = new Date();
      const hold = t.frameworkPriceHoldDays;
      const committed = r2(callOffs.filter((c) => OPEN_STATUSES.includes(c.status)).reduce((s, c) => s + Number(c.totalValue), 0));
      const ceiling = num(t.frameworkCeiling);
      const contractViews = await Promise.all(contracts.map(async (c) => {
        const award = awards.find((a) => a.id === c.awardId);
        const [alines, blines, bid] = await Promise.all([
          tx.tenderAwardLine.findMany({ where: { awardId: c.awardId } }), award ? tx.tenderBidLine.findMany({ where: { bidId: award.bidId } }) : Promise.resolve([]), award ? tx.tenderBid.findUnique({ where: { id: award.bidId } }) : Promise.resolve(null),
        ]);
        const fx = num(bid?.fxRate) ?? 1;
        return {
          contractId: c.id, reference: c.reference, status: c.status, supplierName: names.get(c.awardedOrganizationId) ?? null, endDate: c.endDate, executedAt: c.executedAt,
          holdEndsAt: holdEndsAt(c.executedAt, hold), holdActive: holdActive(now, c.executedAt, hold),
          rank: owner ? debriefs.find((d) => d.bidId === award?.bidId)?.rank ?? null : null,
          callOffCount: callOffs.filter((x) => x.contractId === c.id && OPEN_STATUSES.includes(x.status)).length,
          items: alines.map((al) => {
            const tl = lines.find((x) => x.id === al.tenderLineId); const bl = blines.find((x) => x.tenderLineId === al.tenderLineId);
            const bidPrice = r2((num(bl?.unitPrice) ?? 0) * fx * 10000) / 10000;
            const rv = reviews.filter((x) => x.contractId === c.id && x.tenderLineId === al.tenderLineId);
            return { tenderLineId: al.tenderLineId, lineNumber: tl?.lineNumber ?? 0, lotNumber: tl?.lotNumber ?? null, description: tl?.description ?? "", unit: tl?.unit ?? null, bidPrice, price: effectivePrice(bidPrice, rv.map((x) => ({ status: x.status, proposedPrice: Number(x.proposedPrice), respondedAt: x.respondedAt }))), reviewPending: rv.some((x) => x.status === "PROPOSED") };
          }).sort((a, b) => a.lineNumber - b.lineNumber),
        };
      }));
      const raisers = owner ? new Map((await tx.user.findMany({ where: { id: { in: callOffs.map((c) => c.raisedById) } }, select: { id: true, forename: true, surname: true } })).map((u) => [u.id, `${u.forename} ${u.surname}`.trim()])) : new Map<string, string>();
      return {
        viewer: { party: owner ? "OWNER" : "SUPPLIER" as "OWNER" | "SUPPLIER" },
        tender: { id: t.id, referenceNumber: t.referenceNumber, title: t.title, currency: t.currency, termMonths: t.frameworkTermMonths, method: t.frameworkCallOffMethod as "DIRECT" | "ROTATION" | null, priceHoldDays: hold },
        ceiling: owner ? { value: ceiling, committed, remaining: ceiling === null ? null : r2(ceiling - committed) } : null,
        committedToYou: owner ? null : r2(callOffs.filter((c) => OPEN_STATUSES.includes(c.status)).reduce((s, c) => s + Number(c.totalValue), 0)),
        settings,
        contracts: contractViews,
        callOffs: callOffs.map((c) => ({
          id: c.id, contractId: c.contractId, reference: c.reference, method: c.method, status: c.status, supplierName: names.get(c.awardedOrganizationId) ?? null, currency: c.currency,
          totalValue: Number(c.totalValue), testedValue: Number(c.testedValue), requiresSecondApproval: c.requiresSecondApproval, ceilingExceeded: owner ? c.ceilingExceeded : false,
          deliveryCountryCode: c.deliveryCountryCode, requiredBy: c.requiredBy, notes: c.notes, createdAt: c.createdAt, raisedBy: raisers.get(c.raisedById) ?? null,
          firstApprovedAt: c.firstApprovedAt, secondApprovedAt: c.secondApprovedAt, rejectedReason: c.rejectedReason, declineReason: c.declineReason, respondedAt: c.respondedAt, supplierProjectId: c.supplierProjectId,
          canApprove: owner && c.status === "PENDING_APPROVAL" && canGiveSecondApproval(user.id, c.raisedById, c.firstApprovedById),
          lines: coLines.filter((l) => l.callOffId === c.id).map((l) => ({ tenderLineId: l.tenderLineId, description: lines.find((x) => x.id === l.tenderLineId)?.description ?? "", quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), lineTotal: Number(l.lineTotal) })),
        })),
        priceReviews: reviews.map((r) => ({ id: r.id, contractId: r.contractId, tenderLineId: r.tenderLineId, description: lines.find((x) => x.id === r.tenderLineId)?.description ?? "", previousPrice: Number(r.previousPrice), proposedPrice: Number(r.proposedPrice), reason: r.reason, status: r.status, byYou: r.proposedByOrganizationId === user.organizationId, createdAt: r.createdAt, responseNote: r.responseNote })),
      };
    });
  }

  // ------------------------------------------------------------------ call-offs

  async raise(user: RequestUser, tenderId: string, dto: RaiseCallOffDto) {
    assertHasPermission(user, "tenders.award");
    const lineIds = dto.lines.map((l) => l.tenderLineId);
    if (new Set(lineIds).size !== lineIds.length) throw new BadRequestException("List each item once.");
    const out = await withTenantContext(user.organizationId, async (tx) => {
      const t = await this.tenders.ownTender(tx, user, tenderId);
      if (t.tenderType !== "FRAMEWORK") throw new ConflictException("Call-offs are placed against framework agreements.");
      const method = (t.frameworkCallOffMethod === "ROTATION" ? "ROTATION" : "DIRECT") as "DIRECT" | "ROTATION";
      const now = new Date();
      const contracts = (await tx.tenderContract.findMany({ where: { tenderId, status: "ACTIVE" } })).filter((c) => !c.endDate || c.endDate.getTime() > now.getTime());
      if (contracts.length === 0) throw new ConflictException("There is no active framework agreement to place a call-off against.");
      const existing = await tx.tenderCallOff.findMany({ where: { tenderId, status: { in: OPEN_STATUSES } } });
      const eligible = [];
      for (const c of contracts) {
        const al = await tx.tenderAwardLine.findMany({ where: { awardId: c.awardId } });
        if (lineIds.every((id) => al.some((a) => a.tenderLineId === id))) eligible.push(c);
      }
      if (eligible.length === 0) throw new BadRequestException("No single supplier on this framework covers all of those items. Raise separate call-offs for items awarded to different suppliers.");
      const debriefs = await tx.tenderDebrief.findMany({ where: { tenderId } });
      const awards = await tx.tenderAward.findMany({ where: { tenderId } });
      const pick = chooseSupplier(method, eligible.map((c) => ({ contractId: c.id, organizationId: c.awardedOrganizationId, rank: debriefs.find((d) => d.bidId === awards.find((a) => a.id === c.awardId)?.bidId)?.rank ?? null, callOffs: existing.filter((x) => x.contractId === c.id).length })))!;
      const contract = eligible.find((c) => c.id === pick.contractId)!;
      const award = awards.find((a) => a.id === contract.awardId)!;
      const [blines, bid, reviews, tlines] = await Promise.all([tx.tenderBidLine.findMany({ where: { bidId: award.bidId } }), tx.tenderBid.findUnique({ where: { id: award.bidId } }), tx.tenderPriceReview.findMany({ where: { contractId: contract.id } }), tx.tenderLine.findMany({ where: { tenderId } })]);
      const fx = num(bid?.fxRate) ?? 1;
      const priced = dto.lines.map((l) => {
        const bl = blines.find((x) => x.tenderLineId === l.tenderLineId);
        if (!bl || bl.unitPrice == null) throw new BadRequestException("An item has no agreed price.");
        const bidPrice = Number(bl.unitPrice) * fx;
        const price = effectivePrice(bidPrice, reviews.filter((x) => x.tenderLineId === l.tenderLineId).map((x) => ({ status: x.status, proposedPrice: Number(x.proposedPrice), respondedAt: x.respondedAt })));
        return { tenderLineId: l.tenderLineId, quantity: l.quantity, unitPrice: Math.round(price * 10000) / 10000, lineTotal: r2(price * l.quantity) };
      });
      const total = r2(priced.reduce((s, l) => s + l.lineTotal, 0));
      const cfg = await this.settings(tx, user.organizationId);
      const since = new Date(now.getTime() - cfg.splitWindowDays * 86_400_000);
      const recent = existing.filter((x) => x.awardedOrganizationId === contract.awardedOrganizationId && x.createdAt >= since).reduce((s, x) => s + Number(x.totalValue), 0);
      const need = requiresSecondApproval(total, recent, cfg.individualLimit);
      const committed = existing.reduce((s, x) => s + Number(x.totalValue), 0);
      const cc = ceilingCheck(num(t.frameworkCeiling), committed, total);
      const stale = !holdActive(now, contract.executedAt, t.frameworkPriceHoldDays) ? priced.filter((p) => !reviews.some((x) => x.tenderLineId === p.tenderLineId && x.status === "ACCEPTED")).map((p) => tlines.find((x) => x.id === p.tenderLineId)?.lineNumber) : [];
      const n = (await tx.tenderCallOff.count({ where: { tenderId } })) + 1;
      const status = need.second ? "PENDING_APPROVAL" : "AWAITING_SUPPLIER";
      const co = await tx.tenderCallOff.create({ data: {
        organizationId: user.organizationId, awardedOrganizationId: contract.awardedOrganizationId, tenderId, contractId: contract.id, reference: `CO-${t.referenceNumber}-${n}`, method, status,
        currency: t.currency, totalValue: total, testedValue: need.tested, requiresSecondApproval: need.second, ceilingExceeded: cc.exceeded,
        deliveryCountryCode: dto.deliveryCountryCode?.toUpperCase(), requiredBy: dto.requiredBy ? new Date(dto.requiredBy) : null, notes: dto.notes, raisedById: user.id, firstApprovedById: user.id, firstApprovedAt: now,
      } });
      for (const l of priced) await tx.tenderCallOffLine.create({ data: { organizationId: user.organizationId, awardedOrganizationId: contract.awardedOrganizationId, tenderId, callOffId: co.id, tenderLineId: l.tenderLineId, quantity: l.quantity, unitPrice: l.unitPrice, lineTotal: l.lineTotal } });
      return { t, co, warnings: [
        ...(cc.exceeded ? [`This call-off takes committed spend over the framework's maximum value (by ${Math.abs(cc.remainingAfter ?? 0).toLocaleString()}). It has been recorded as over the ceiling.`] : []),
        ...(stale.length ? [`The price-hold period has ended and item${stale.length > 1 ? "s" : ""} ${stale.join(", ")} ${stale.length > 1 ? "have" : "has"} not had a price review. The supplier's original bid price was used.`] : []),
        ...(need.second ? [`The value, with recent orders to this supplier (${need.tested.toLocaleString()}), is above your approval limit of ${cfg.individualLimit.toLocaleString()}. A second, different authoriser must approve it before it goes to the supplier.`] : []),
      ] };
    });
    await this.event(out.t, out.co.awardedOrganizationId, user, "CALL_OFF_RAISED", `Call-off ${out.co.reference} raised (${out.co.method === "ROTATION" ? "rotation" : "direct award"}), ${out.co.status === "PENDING_APPROVAL" ? "awaiting second authorisation" : "sent to the supplier"}`, { callOffId: out.co.id, totalValue: Number(out.co.totalValue), ceilingExceeded: out.co.ceilingExceeded });
    if (out.co.status === "AWAITING_SUPPLIER") await this.tellSupplier(out.t, out.co, user);
    return { id: out.co.id, status: out.co.status, warnings: out.warnings };
  }

  private async tellSupplier(t: { id: string; title: string; referenceNumber: string }, co: { awardedOrganizationId: string; reference: string }, user: RequestUser) {
    await this.tenders.notifyOrgs([co.awardedOrganizationId], () => ({ title: `Call-off ${co.reference}`, body: `A call-off has been placed with you under ${t.title}. Please accept or decline it.`, link: `/tenders/framework?id=${t.id}`, subjectId: t.id }), "TENDER_CALL_OFF", user.id);
  }

  async approve(user: RequestUser, callOffId: string) {
    assertHasPermission(user, "tenders.award");
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const co = await tx.tenderCallOff.findFirst({ where: { id: callOffId, organizationId: user.organizationId } });
      if (!co) throw new NotFoundException("Call-off not found.");
      if (co.status !== "PENDING_APPROVAL") throw new ConflictException("This call-off is not waiting for approval.");
      if (!canGiveSecondApproval(user.id, co.raisedById, co.firstApprovedById)) throw new ForbiddenException("The second authoriser must be someone other than the person who raised the call-off.");
      const t = await tx.tender.findUnique({ where: { id: co.tenderId } });
      await tx.tenderCallOff.update({ where: { id: co.id }, data: { status: "AWAITING_SUPPLIER", secondApprovedById: user.id, secondApprovedAt: new Date() } });
      return { co, t: t! };
    });
    await this.event(r.t, r.co.awardedOrganizationId, user, "CALL_OFF_APPROVED", `Call-off ${r.co.reference} given second authorisation and sent to the supplier`, { callOffId: r.co.id });
    await this.tellSupplier(r.t, r.co, user);
    return this.view(user, r.co.tenderId);
  }

  async reject(user: RequestUser, callOffId: string, reason: string, cancelOnly = false) {
    assertHasPermission(user, "tenders.award");
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const co = await tx.tenderCallOff.findFirst({ where: { id: callOffId, organizationId: user.organizationId } });
      if (!co) throw new NotFoundException("Call-off not found.");
      if (!(co.status === "PENDING_APPROVAL" || co.status === "AWAITING_SUPPLIER")) throw new ConflictException("Only a call-off that has not yet been accepted can be cancelled.");
      const t = await tx.tender.findUnique({ where: { id: co.tenderId } });
      await tx.tenderCallOff.update({ where: { id: co.id }, data: { status: "CANCELLED", rejectedReason: reason } });
      return { co, t: t! };
    });
    await this.event(r.t, r.co.awardedOrganizationId, user, "CALL_OFF_CANCELLED", `Call-off ${r.co.reference} ${cancelOnly ? "cancelled" : "not approved"}: ${reason.slice(0, 200)}`, { callOffId: r.co.id });
    return this.view(user, r.co.tenderId);
  }

  async respond(user: RequestUser, callOffId: string, accept: boolean, reason?: string) {
    assertHasPermission(user, "tenders.bid");
    if (!accept && !reason?.trim()) throw new BadRequestException("Give a reason for declining.");
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const co = await tx.tenderCallOff.findFirst({ where: { id: callOffId, awardedOrganizationId: user.organizationId } });
      if (!co) throw new NotFoundException("Call-off not found.");
      if (co.status !== "AWAITING_SUPPLIER") throw new ConflictException("This call-off is not waiting for your answer.");
      const t = await tx.tender.findUnique({ where: { id: co.tenderId } });
      await tx.tenderCallOff.update({ where: { id: co.id }, data: { status: accept ? "ACCEPTED" : "DECLINED", respondedAt: new Date(), declineReason: accept ? null : reason } });
      return { co, t: t! };
    });
    await this.event(r.t, r.co.organizationId, user, accept ? "CALL_OFF_ACCEPTED" : "CALL_OFF_DECLINED", `Supplier ${accept ? "accepted" : "declined"} call-off ${r.co.reference}${accept ? "" : `: ${reason!.slice(0, 200)}`}`, { callOffId: r.co.id });
    await this.tenders.notifyOrgs([r.co.organizationId], () => ({ title: `Call-off ${accept ? "accepted" : "declined"}: ${r.co.reference}`, body: accept ? `The supplier has accepted the call-off under ${r.t.title}.` : `The supplier declined the call-off under ${r.t.title}: ${reason}`, link: `/tenders/framework?id=${r.t.id}`, subjectId: r.t.id }), "TENDER_CALL_OFF", user.id);
    return this.view(user, r.co.tenderId);
  }

  /** The supplier creates its Project Management project from an accepted call-off. */
  async createProject(user: RequestUser, callOffId: string) {
    assertHasPermission(user, "tenders.bid");
    assertHasPermission(user, "projects.create");
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const co = await tx.tenderCallOff.findFirst({ where: { id: callOffId, awardedOrganizationId: user.organizationId } });
      if (!co) throw new NotFoundException("Call-off not found.");
      if (co.status !== "ACCEPTED") throw new ConflictException("A project can be created once the call-off is accepted.");
      if (co.supplierProjectId) throw new ConflictException("A project has already been created for this call-off.");
      const [t, lines] = await Promise.all([tx.tender.findUnique({ where: { id: co.tenderId } }), tx.tenderCallOffLine.findMany({ where: { callOffId: co.id } })]);
      const tlines = await tx.tenderLine.findMany({ where: { id: { in: lines.map((l) => l.tenderLineId) } } });
      const project = await tx.project.create({ data: {
        organizationId: user.organizationId, referenceNumber: co.reference, title: `Call-off ${co.reference}: ${t?.title ?? ""}`.slice(0, 300), category: "PROCUREMENT", projectType: "NON_PHARMACEUTICAL", status: "AWARDED",
        dueDate: co.requiredBy ?? undefined, incoterm: t?.incoterm ?? undefined, ...(co.deliveryCountryCode ? { deliveryCountryCode: co.deliveryCountryCode, deliveryCountryCodes: co.deliveryCountryCode } : {}),
        projectNotes: `Created from framework call-off ${co.reference} (tender ${t?.referenceNumber ?? ""}).`,
        lines: { create: lines.map((l) => { const tl = tlines.find((x) => x.id === l.tenderLineId); return { organizationId: user.organizationId, clientProductDescription: tl?.description ?? "Item", productMasterId: tl?.productMasterId ?? undefined, quantity: Math.round(Number(l.quantity)) }; }) },
      } });
      await tx.projectStatusHistory.create({ data: { organizationId: user.organizationId, projectId: project.id, status: "AWARDED", changedById: user.id } });
      await tx.tenderCallOff.update({ where: { id: co.id }, data: { supplierProjectId: project.id } });
      return { co, t: t!, project };
    });
    await this.event(r.t, r.co.organizationId, user, "PROJECT_CREATED", `Supplier created its delivery project from call-off ${r.co.reference}`, { projectId: r.project.id });
    return { projectId: r.project.id };
  }

  // ------------------------------------------------------------------ price reviews

  async proposePrice(user: RequestUser, contractId: string, dto: PriceReviewDto) {
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const c = await tx.tenderContract.findUnique({ where: { id: contractId } });
      if (!c) throw new NotFoundException("Agreement not found.");
      const owner = c.organizationId === user.organizationId;
      if (!owner && c.awardedOrganizationId !== user.organizationId) throw new NotFoundException("Agreement not found.");
      assertHasPermission(user, owner ? "tenders.award" : "tenders.bid");
      const t = await tx.tender.findUnique({ where: { id: c.tenderId } });
      if (!t || t.tenderType !== "FRAMEWORK") throw new ConflictException("Price reviews apply to framework agreements.");
      if (c.status !== "ACTIVE") throw new ConflictException("Prices can be reviewed while the agreement is active.");
      if (holdActive(new Date(), c.executedAt, t.frameworkPriceHoldDays)) throw new ConflictException(`Prices are held until ${holdEndsAt(c.executedAt, t.frameworkPriceHoldDays)?.toISOString().slice(0, 10)}. A review can be proposed after that.`);
      const al = await tx.tenderAwardLine.findFirst({ where: { awardId: c.awardId, tenderLineId: dto.tenderLineId } });
      if (!al) throw new BadRequestException("That item is not part of this agreement.");
      if (await tx.tenderPriceReview.findFirst({ where: { contractId, tenderLineId: dto.tenderLineId, status: "PROPOSED" } })) throw new ConflictException("A review of that item is already waiting for an answer.");
      const award = await tx.tenderAward.findUnique({ where: { id: c.awardId } });
      const [bl, bid, reviews] = await Promise.all([tx.tenderBidLine.findFirst({ where: { bidId: award!.bidId, tenderLineId: dto.tenderLineId } }), tx.tenderBid.findUnique({ where: { id: award!.bidId } }), tx.tenderPriceReview.findMany({ where: { contractId, tenderLineId: dto.tenderLineId } })]);
      const current = effectivePrice(Number(bl?.unitPrice ?? 0) * (num(bid?.fxRate) ?? 1), reviews.map((x) => ({ status: x.status, proposedPrice: Number(x.proposedPrice), respondedAt: x.respondedAt })));
      const pr = await tx.tenderPriceReview.create({ data: { organizationId: c.organizationId, awardedOrganizationId: c.awardedOrganizationId, tenderId: c.tenderId, contractId, tenderLineId: dto.tenderLineId, previousPrice: current, proposedPrice: dto.proposedPrice, reason: dto.reason, proposedByOrganizationId: user.organizationId } });
      return { c, t, pr, owner };
    });
    await this.event(r.t, r.owner ? r.c.awardedOrganizationId : r.c.organizationId, user, "PRICE_REVIEW_PROPOSED", `Price review proposed on an item: ${Number(r.pr.previousPrice)} to ${Number(r.pr.proposedPrice)}`, { reviewId: r.pr.id });
    await this.tenders.notifyOrgs([r.owner ? r.c.awardedOrganizationId : r.c.organizationId], () => ({ title: `Price review proposed: ${r.t.referenceNumber}`, body: `A change to an agreed price has been proposed under ${r.t.title}. Please accept or reject it.`, link: `/tenders/framework?id=${r.t.id}`, subjectId: r.t.id }), "TENDER_PRICE_REVIEW", user.id);
    return this.view(user, r.c.tenderId);
  }

  async respondPrice(user: RequestUser, reviewId: string, dto: PriceReviewResponseDto) {
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const pr = await tx.tenderPriceReview.findUnique({ where: { id: reviewId } });
      if (!pr || (pr.organizationId !== user.organizationId && pr.awardedOrganizationId !== user.organizationId)) throw new NotFoundException("Price review not found.");
      if (pr.proposedByOrganizationId === user.organizationId) throw new ForbiddenException("The other party answers a proposed price change.");
      assertHasPermission(user, pr.organizationId === user.organizationId ? "tenders.award" : "tenders.bid");
      if (pr.status !== "PROPOSED") throw new ConflictException("This review has already been answered.");
      const t = await tx.tender.findUnique({ where: { id: pr.tenderId } });
      await tx.tenderPriceReview.update({ where: { id: pr.id }, data: { status: dto.accept ? "ACCEPTED" : "REJECTED", respondedAt: new Date(), responseNote: dto.note } });
      return { pr, t: t! };
    });
    await this.event(r.t, r.pr.proposedByOrganizationId, user, dto.accept ? "PRICE_REVIEW_ACCEPTED" : "PRICE_REVIEW_REJECTED", `Price review ${dto.accept ? "accepted" : "rejected"}`, { reviewId: r.pr.id });
    await this.tenders.notifyOrgs([r.pr.proposedByOrganizationId], () => ({ title: `Price review ${dto.accept ? "accepted" : "rejected"}: ${r.t.referenceNumber}`, body: `Your proposed price change under ${r.t.title} was ${dto.accept ? "accepted" : "rejected"}.`, link: `/tenders/framework?id=${r.t.id}`, subjectId: r.t.id }), "TENDER_PRICE_REVIEW", user.id);
    return this.view(user, r.pr.tenderId);
  }

  /** Used at contract creation: a framework contract ends at its term. */
  static endDateFor(start: Date | null, months: number | null): Date | null {
    return months ? addMonths(start ?? new Date(), months) : null;
  }
}
