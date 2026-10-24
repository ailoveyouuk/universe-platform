import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { withTenantContext } from "@universe/db";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertHasPermission } from "../common/authorization";
import type { ApprovalSettingsDto, MiniAwardDto, MiniQuoteDto, OpenMiniCompetitionDto, PriceReviewDto, PriceReviewResponseDto, RaiseCallOffDto } from "./dto/tenders.dto";
import { addMonths, canGiveSecondApproval, ceilingCheck, chooseSupplier, DEFAULT_INDIVIDUAL_LIMIT, DEFAULT_SPLIT_WINDOW_DAYS, competitionOpen, effectivePrice, holdActive, holdEndsAt, MIN_COMPETITORS, quoteProblems, requiresSecondApproval } from "./tender-framework";
import { appendTenderEvent } from "./tender-events";
import { TendersService } from "./tenders.service";
import { TenderPerformanceService } from "./tender-performance.service";
import { loadSettings } from "../quality/scorecard-settings.service";

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
  constructor(private readonly tenders: TendersService, private readonly performance: TenderPerformanceService) {}

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
        const mineCo = callOffs.filter((x) => x.contractId === c.id);
        const facts = this.performance.callOffFacts(mineCo);
        const cfg = owner ? await loadSettings(tx, user.organizationId) : null;
        const dlv = cfg ? await this.performance.deliveryFacts(cfg, mineCo.filter((x) => x.status === "ACCEPTED" && x.supplierProjectId).map((x) => x.supplierProjectId!)) : null;
        const pct = (y: number, n: number) => (n > 0 ? Math.round(100 * y / n) : null);
        return {
          performance: { ...facts, onTimePercent: dlv ? pct(dlv.onTimeYes, dlv.onTimeFlags) : null, inFullPercent: dlv ? pct(dlv.inFullYes, dlv.inFullFlags) : null, deliveriesMeasured: dlv ? Math.max(dlv.onTimeFlags, dlv.inFullFlags) : 0 },
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
      const mini = await this.miniView(tx, user, tenderId, owner, lines, names, now);
      return {
        viewer: { party: owner ? "OWNER" : "SUPPLIER" as "OWNER" | "SUPPLIER" },
        miniCompetitions: mini.competitions, invitations: mini.invitations,
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
      const stale = !holdActive(now, contract.executedAt, t.frameworkPriceHoldDays) ? priced.filter((p) => !reviews.some((x) => x.tenderLineId === p.tenderLineId && x.status === "ACCEPTED")).map((p) => tlines.find((x) => x.id === p.tenderLineId)?.lineNumber) : [];
      return this.place(tx, user, { t, contract, priced, method, existing, now, stale, deliveryCountryCode: dto.deliveryCountryCode, requiredBy: dto.requiredBy, notes: dto.notes });
    });
    await this.event(out.t, out.co.awardedOrganizationId, user, "CALL_OFF_RAISED", `Call-off ${out.co.reference} raised (${out.co.method === "ROTATION" ? "rotation" : "direct award"}), ${out.co.status === "PENDING_APPROVAL" ? "awaiting second authorisation" : "sent to the supplier"}`, { callOffId: out.co.id, totalValue: Number(out.co.totalValue), ceilingExceeded: out.co.ceilingExceeded });
    if (out.co.status === "AWAITING_SUPPLIER") await this.tellSupplier(out.t, out.co, user);
    return { id: out.co.id, status: out.co.status, warnings: out.warnings };
  }


  /** Creates the call-off record for a chosen supplier at the given prices, applying the approval limit and ceiling. Shared by direct/rotation and mini-competition. */
  private async place(tx: Tx, user: RequestUser, o: { t: Awaited<ReturnType<TendersService["ownTender"]>>; contract: { id: string; awardedOrganizationId: string }; priced: { tenderLineId: string; quantity: number; unitPrice: number; lineTotal: number }[]; method: string; existing: { awardedOrganizationId: string; createdAt: Date; totalValue: unknown }[]; now: Date; stale: (number | undefined)[]; deliveryCountryCode?: string; requiredBy?: string | Date | null; notes?: string | null; quoteId?: string }) {
    const { t, contract, priced, method, existing, now, stale } = o; const tenderId = t.id;
    const total = r2(priced.reduce((s, l) => s + l.lineTotal, 0));
      const cfg = await this.settings(tx, user.organizationId);
      const since = new Date(now.getTime() - cfg.splitWindowDays * 86_400_000);
      const recent = existing.filter((x) => x.awardedOrganizationId === contract.awardedOrganizationId && x.createdAt >= since).reduce((s, x) => s + Number(x.totalValue), 0);
      const need = requiresSecondApproval(total, recent, cfg.individualLimit);
      const committed = existing.reduce((s, x) => s + Number(x.totalValue), 0);
      const cc = ceilingCheck(num(t.frameworkCeiling), committed, total);
      const n = (await tx.tenderCallOff.count({ where: { tenderId } })) + 1;
      const status = need.second ? "PENDING_APPROVAL" : "AWAITING_SUPPLIER";
      const co = await tx.tenderCallOff.create({ data: {
        organizationId: user.organizationId, awardedOrganizationId: contract.awardedOrganizationId, tenderId, contractId: contract.id, reference: `CO-${t.referenceNumber}-${n}`, method, status,
        currency: t.currency, totalValue: total, testedValue: need.tested, requiresSecondApproval: need.second, ceilingExceeded: cc.exceeded,
        deliveryCountryCode: o.deliveryCountryCode?.toUpperCase(), requiredBy: o.requiredBy ? new Date(o.requiredBy) : null, notes: o.notes, raisedById: user.id, firstApprovedById: user.id, firstApprovedAt: now, quoteId: o.quoteId,
      } });
      for (const l of priced) await tx.tenderCallOffLine.create({ data: { organizationId: user.organizationId, awardedOrganizationId: contract.awardedOrganizationId, tenderId, callOffId: co.id, tenderLineId: l.tenderLineId, quantity: l.quantity, unitPrice: l.unitPrice, lineTotal: l.lineTotal } });
      return { t, co, warnings: [
        ...(cc.exceeded ? [`This call-off takes committed spend over the framework's maximum value (by ${Math.abs(cc.remainingAfter ?? 0).toLocaleString()}). It has been recorded as over the ceiling.`] : []),
        ...(stale.length ? [`The price-hold period has ended and item${stale.length > 1 ? "s" : ""} ${stale.join(", ")} ${stale.length > 1 ? "have" : "has"} not had a price review. The supplier's original bid price was used.`] : []),
        ...(need.second ? [`The value, with recent orders to this supplier (${need.tested.toLocaleString()}), is above your approval limit of ${cfg.individualLimit.toLocaleString()}. A second, different authoriser must approve it before it goes to the supplier.`] : []),
      ] };
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
        organizationId: user.organizationId, sourceTenderId: co.tenderId, sourceCallOffId: co.id, referenceNumber: co.reference, title: `Call-off ${co.reference}: ${t?.title ?? ""}`.slice(0, 300), category: "PROCUREMENT", projectType: "NON_PHARMACEUTICAL", status: "AWARDED",
        dueDate: co.requiredBy ?? undefined, incoterm: t?.incoterm ?? undefined, ...(co.deliveryCountryCode ? { deliveryCountryCode: co.deliveryCountryCode, deliveryCountryCodes: co.deliveryCountryCode } : {}),
        projectNotes: `Created from framework call-off ${co.reference} (tender ${t?.referenceNumber ?? ""}).`,
        lines: { create: lines.map((l) => { const tl = tlines.find((x) => x.id === l.tenderLineId); return { organizationId: user.organizationId, clientProductDescription: tl?.description ?? "Item", productMasterId: tl?.productMasterId ?? undefined, sourceTenderLineId: l.tenderLineId, quantity: Math.round(Number(l.quantity)), unitSalesPrice: Number(l.unitPrice), clientPaymentCurrency: co.currency ?? t?.currency ?? undefined, clientPaymentAmount: Number(l.lineTotal) }; }) },
      } });
      await tx.projectStatusHistory.create({ data: { organizationId: user.organizationId, projectId: project.id, status: "AWARDED", changedById: user.id } });
      await tx.tenderCallOff.update({ where: { id: co.id }, data: { supplierProjectId: project.id } });
      return { co, t: t!, project };
    });
    await this.event(r.t, r.co.organizationId, user, "PROJECT_CREATED", `Supplier created its delivery project from call-off ${r.co.reference}`, { projectId: r.project.id });
    return { projectId: r.project.id };
  }


  // ------------------------------------------------------------------ mini-competition

  /** Prices a supplier has agreed for the given items: its bid price, converted, unless a later price review was accepted. */
  private async agreedPrices(tx: Tx, contract: { id: string; awardId: string }, lineIds: string[]) {
    const award = await tx.tenderAward.findUnique({ where: { id: contract.awardId } });
    const [blines, bid, reviews] = await Promise.all([tx.tenderBidLine.findMany({ where: { bidId: award!.bidId } }), tx.tenderBid.findUnique({ where: { id: award!.bidId } }), tx.tenderPriceReview.findMany({ where: { contractId: contract.id } })]);
    const fx = num(bid?.fxRate) ?? 1;
    const out = new Map<string, number>();
    for (const id of lineIds) {
      const bl = blines.find((x) => x.tenderLineId === id);
      if (!bl || bl.unitPrice == null) throw new BadRequestException("An item has no agreed price.");
      const price = effectivePrice(Number(bl.unitPrice) * fx, reviews.filter((x) => x.tenderLineId === id).map((x) => ({ status: x.status, proposedPrice: Number(x.proposedPrice), respondedAt: x.respondedAt })));
      out.set(id, Math.round(price * 10000) / 10000);
    }
    return out;
  }

  private async miniView(tx: Tx, user: RequestUser, tenderId: string, owner: boolean, tlines: { id: string; description: string }[], names: Map<string, string>, now: Date) {
    const desc = (id: string) => tlines.find((x) => x.id === id)?.description ?? "";
    const quotes = await tx.tenderCallOffQuote.findMany({ where: { tenderId, ...(owner ? {} : { awardedOrganizationId: user.organizationId }) }, orderBy: { createdAt: "asc" } });
    const qlines = quotes.length ? await tx.tenderCallOffQuoteLine.findMany({ where: { quoteId: { in: quotes.map((q) => q.id) } } }) : [];
    const lineViews = (qid: string, quantities?: Map<string, number>) => qlines.filter((l) => l.quoteId === qid).map((l) => ({ tenderLineId: l.tenderLineId, description: desc(l.tenderLineId), quantity: Number(l.quantity), frameworkPrice: Number(l.frameworkPrice), quotedPrice: num(l.quotedPrice), leadTimeDays: l.leadTimeDays }));
    if (!owner) {
      return { competitions: [] as unknown[], invitations: quotes.map((q) => ({ id: q.id, reference: q.reference, status: q.status, closesAt: q.closesAt, open: q.status !== "CANCELLED" && competitionOpen(q.closesAt, now), requestNotes: q.requestNotes, deliveryCountryCode: q.deliveryCountryCode, requiredBy: q.requiredBy, quotedAt: q.quotedAt, totalValue: num(q.totalValue), quoteNotes: q.quoteNotes, declineReason: q.declineReason, lines: lineViews(q.id) })) };
    }
    const comps = await tx.tenderMiniCompetition.findMany({ where: { tenderId }, orderBy: { createdAt: "desc" } });
    return { invitations: [] as unknown[], competitions: comps.map((c) => {
      const cq = quotes.filter((q) => q.competitionId === c.id);
      const sealed = c.status === "OPEN" && competitionOpen(c.closesAt, now);
      const lines = (JSON.parse(c.linesJson) as { tenderLineId: string; quantity: number }[]).map((l) => ({ tenderLineId: l.tenderLineId, description: desc(l.tenderLineId), quantity: l.quantity }));
      return {
        id: c.id, reference: c.reference, status: c.status, closesAt: c.closesAt, sealed, notes: c.notes, requiredBy: c.requiredBy, deliveryCountryCode: c.deliveryCountryCode, lines,
        invited: cq.length, quotesReceived: cq.filter((q) => q.status === "QUOTED" || q.status === "WON" || q.status === "LOST").length,
        awardedQuoteId: c.awardedQuoteId, awardReason: c.awardReason, cancelReason: c.cancelReason,
        canAward: c.status === "OPEN" && !sealed && cq.some((q) => q.status === "QUOTED"),
        quotes: sealed ? [] : cq.map((q) => ({ id: q.id, supplierName: names.get(q.awardedOrganizationId) ?? null, status: q.status, totalValue: num(q.totalValue), quotedAt: q.quotedAt, quoteNotes: q.quoteNotes, declineReason: q.declineReason, lines: lineViews(q.id) })),
      };
    }) };
  }

  /** The owner invites every framework supplier that covers all the requested items, at least two, to quote at or below their framework prices. */
  async openCompetition(user: RequestUser, tenderId: string, dto: OpenMiniCompetitionDto) {
    assertHasPermission(user, "tenders.award");
    const lineIds = dto.lines.map((l) => l.tenderLineId);
    if (new Set(lineIds).size !== lineIds.length) throw new BadRequestException("List each item once.");
    const closesAt = new Date(dto.closesAt);
    const now = new Date();
    if (!(closesAt.getTime() > now.getTime())) throw new BadRequestException("The closing time must be in the future.");
    if (closesAt.getTime() - now.getTime() > 90 * 86_400_000) throw new BadRequestException("The closing time can be at most 90 days away.");
    const out = await withTenantContext(user.organizationId, async (tx) => {
      const t = await this.tenders.ownTender(tx, user, tenderId);
      if (t.tenderType !== "FRAMEWORK") throw new ConflictException("Mini-competitions are run on framework agreements.");
      const contracts = (await tx.tenderContract.findMany({ where: { tenderId, status: "ACTIVE" } })).filter((c) => !c.endDate || c.endDate.getTime() > now.getTime());
      const eligible = [];
      for (const c of contracts) {
        const al = await tx.tenderAwardLine.findMany({ where: { awardId: c.awardId } });
        if (lineIds.every((id) => al.some((a) => a.tenderLineId === id))) eligible.push(c);
      }
      if (eligible.length < MIN_COMPETITORS) throw new BadRequestException(`A mini-competition needs at least ${MIN_COMPETITORS} framework suppliers that cover all of those items; ${eligible.length} do. Use a direct or rotation call-off instead.`);
      const n = (await tx.tenderMiniCompetition.count({ where: { tenderId } })) + 1;
      const reference = `MC-${t.referenceNumber}-${n}`;
      const comp = await tx.tenderMiniCompetition.create({ data: { organizationId: user.organizationId, tenderId, reference, notes: dto.notes, deliveryCountryCode: dto.deliveryCountryCode?.toUpperCase(), requiredBy: dto.requiredBy ? new Date(dto.requiredBy) : null, closesAt, linesJson: JSON.stringify(dto.lines.map((l) => ({ tenderLineId: l.tenderLineId, quantity: l.quantity }))), createdById: user.id } });
      const invited: string[] = [];
      for (const c of eligible) {
        const prices = await this.agreedPrices(tx, c, lineIds);
        const q = await tx.tenderCallOffQuote.create({ data: { organizationId: user.organizationId, awardedOrganizationId: c.awardedOrganizationId, tenderId, competitionId: comp.id, contractId: c.id, reference, closesAt, requestNotes: dto.notes, deliveryCountryCode: dto.deliveryCountryCode?.toUpperCase(), requiredBy: dto.requiredBy ? new Date(dto.requiredBy) : null } });
        for (const l of dto.lines) await tx.tenderCallOffQuoteLine.create({ data: { organizationId: user.organizationId, awardedOrganizationId: c.awardedOrganizationId, tenderId, quoteId: q.id, tenderLineId: l.tenderLineId, quantity: l.quantity, frameworkPrice: prices.get(l.tenderLineId)! } });
        invited.push(c.awardedOrganizationId);
      }
      return { t, comp, invited };
    });
    for (const org of out.invited) await this.event(out.t, org, user, "MINI_COMP_INVITED", `Mini-competition ${out.comp.reference} opened; supplier invited to quote by ${closesAt.toISOString().slice(0, 16).replace("T", " ")} UTC`, { competitionId: out.comp.id });
    await this.tenders.notifyOrgs(out.invited, () => ({ title: `Invitation to quote: ${out.comp.reference}`, body: `You are invited to quote for a call-off under ${out.t.title}. Quotes close ${closesAt.toISOString().slice(0, 16).replace("T", " ")} UTC.`, link: `/tenders/framework?id=${out.t.id}`, subjectId: out.t.id }), "TENDER_MINI_COMPETITION", user.id);
    return this.view(user, tenderId);
  }

  /** Ends the quoting period now (useful for demonstrations, or when every supplier has answered). Quotes then become readable and can be awarded. */
  async closeCompetition(user: RequestUser, competitionId: string) {
    assertHasPermission(user, "tenders.award");
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const c = await tx.tenderMiniCompetition.findFirst({ where: { id: competitionId, organizationId: user.organizationId } });
      if (!c) throw new NotFoundException("Mini-competition not found.");
      if (c.status !== "OPEN") throw new ConflictException("This mini-competition is no longer open.");
      const now = new Date();
      if (!competitionOpen(c.closesAt, now)) throw new ConflictException("Quoting has already closed.");
      await tx.tenderMiniCompetition.update({ where: { id: c.id }, data: { closesAt: now } });
      await tx.tenderCallOffQuote.updateMany({ where: { competitionId: c.id }, data: { closesAt: now } });
      const t = await tx.tender.findUnique({ where: { id: c.tenderId } });
      const qs = await tx.tenderCallOffQuote.findMany({ where: { competitionId: c.id } });
      return { c, t: t!, orgs: qs.map((q) => q.awardedOrganizationId) };
    });
    for (const org of r.orgs) await this.event(r.t, org, user, "MINI_COMP_CLOSED", `Quoting for ${r.c.reference} closed early by the owner`, { competitionId: r.c.id });
    return this.view(user, r.t.id);
  }

  async cancelCompetition(user: RequestUser, competitionId: string, reason: string) {
    assertHasPermission(user, "tenders.award");
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const c = await tx.tenderMiniCompetition.findFirst({ where: { id: competitionId, organizationId: user.organizationId } });
      if (!c) throw new NotFoundException("Mini-competition not found.");
      if (c.status !== "OPEN") throw new ConflictException("Only an open mini-competition can be cancelled.");
      await tx.tenderMiniCompetition.update({ where: { id: c.id }, data: { status: "CANCELLED", cancelReason: reason } });
      await tx.tenderCallOffQuote.updateMany({ where: { competitionId: c.id }, data: { status: "CANCELLED" } });
      const t = await tx.tender.findUnique({ where: { id: c.tenderId } });
      const qs = await tx.tenderCallOffQuote.findMany({ where: { competitionId: c.id } });
      return { c, t: t!, orgs: qs.map((q) => q.awardedOrganizationId) };
    });
    for (const org of r.orgs) await this.event(r.t, org, user, "MINI_COMP_CANCELLED", `Mini-competition ${r.c.reference} cancelled: ${reason.slice(0, 200)}`, { competitionId: r.c.id });
    await this.tenders.notifyOrgs(r.orgs, () => ({ title: `Mini-competition cancelled: ${r.c.reference}`, body: `The invitation to quote under ${r.t.title} has been cancelled: ${reason}`, link: `/tenders/framework?id=${r.t.id}`, subjectId: r.t.id }), "TENDER_MINI_COMPETITION", user.id);
    return this.view(user, r.t.id);
  }

  /** A supplier submits (or replaces, until the deadline) its quote. Every item must be priced, at or below its framework price. */
  async submitQuote(user: RequestUser, quoteId: string, dto: MiniQuoteDto) {
    assertHasPermission(user, "tenders.bid");
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const q = await tx.tenderCallOffQuote.findFirst({ where: { id: quoteId, awardedOrganizationId: user.organizationId } });
      if (!q) throw new NotFoundException("Invitation not found.");
      if (!(q.status === "INVITED" || q.status === "QUOTED") || !competitionOpen(q.closesAt, new Date())) throw new ConflictException("Quoting for this invitation has closed.");
      const lines = await tx.tenderCallOffQuoteLine.findMany({ where: { quoteId: q.id } });
      const tl = await tx.tenderLine.findMany({ where: { id: { in: lines.map((l) => l.tenderLineId) } } });
      const given = new Map(dto.lines.map((l) => [l.tenderLineId, l]));
      const problems = quoteProblems(lines.map((l) => ({ label: tl.find((x) => x.id === l.tenderLineId)?.description ?? "an item", frameworkPrice: Number(l.frameworkPrice), quotedPrice: given.get(l.tenderLineId)?.quotedPrice })));
      if (dto.lines.some((l) => !lines.some((x) => x.tenderLineId === l.tenderLineId))) problems.push("The quote includes an item that was not requested.");
      if (problems.length) throw new BadRequestException(problems.join(" "));
      let total = 0;
      for (const l of lines) {
        const g = given.get(l.tenderLineId)!;
        total += Number(l.quantity) * g.quotedPrice;
        await tx.tenderCallOffQuoteLine.update({ where: { id: l.id }, data: { quotedPrice: g.quotedPrice, leadTimeDays: g.leadTimeDays ?? null } });
      }
      await tx.tenderCallOffQuote.update({ where: { id: q.id }, data: { status: "QUOTED", quotedAt: new Date(), totalValue: r2(total), quoteNotes: dto.notes ?? null, declineReason: null } });
      const t = await tx.tender.findUnique({ where: { id: q.tenderId } });
      return { q, t: t!, total: r2(total) };
    });
    await this.event(r.t, r.q.organizationId, user, "MINI_COMP_QUOTED", `Supplier submitted a quote for ${r.q.reference}`, { quoteId: r.q.id });
    return this.view(user, r.t.id);
  }

  async declineQuote(user: RequestUser, quoteId: string, reason: string) {
    assertHasPermission(user, "tenders.bid");
    if (!reason?.trim()) throw new BadRequestException("Give a reason for declining to quote.");
    const r = await withTenantContext(user.organizationId, async (tx) => {
      const q = await tx.tenderCallOffQuote.findFirst({ where: { id: quoteId, awardedOrganizationId: user.organizationId } });
      if (!q) throw new NotFoundException("Invitation not found.");
      if (!(q.status === "INVITED" || q.status === "QUOTED") || !competitionOpen(q.closesAt, new Date())) throw new ConflictException("Quoting for this invitation has closed.");
      await tx.tenderCallOffQuote.update({ where: { id: q.id }, data: { status: "DECLINED", declineReason: reason, totalValue: null } });
      const t = await tx.tender.findUnique({ where: { id: q.tenderId } });
      return { q, t: t! };
    });
    await this.event(r.t, r.q.organizationId, user, "MINI_COMP_DECLINED", `Supplier declined to quote for ${r.q.reference}: ${reason.slice(0, 200)}`, { quoteId: r.q.id });
    return this.view(user, r.t.id);
  }

  /** After quoting closes the owner chooses a winner and records why. The win becomes an ordinary call-off, so the approval limit and ceiling apply as usual. */
  async awardCompetition(user: RequestUser, competitionId: string, dto: MiniAwardDto) {
    assertHasPermission(user, "tenders.award");
    if ((dto.reason ?? "").trim().length < 5) throw new BadRequestException("Record why this supplier was chosen.");
    const out = await withTenantContext(user.organizationId, async (tx) => {
      const c = await tx.tenderMiniCompetition.findFirst({ where: { id: competitionId, organizationId: user.organizationId } });
      if (!c) throw new NotFoundException("Mini-competition not found.");
      if (c.status !== "OPEN") throw new ConflictException("This mini-competition is no longer open.");
      const now = new Date();
      if (competitionOpen(c.closesAt, now)) throw new ConflictException("Quotes are sealed until the closing time. Close quoting first if you want to award now.");
      const t = await this.tenders.ownTender(tx, user, c.tenderId);
      const quotes = await tx.tenderCallOffQuote.findMany({ where: { competitionId: c.id } });
      const win = quotes.find((q) => q.id === dto.quoteId);
      if (!win || win.status !== "QUOTED") throw new BadRequestException("Choose one of the quotes that was submitted.");
      const contract = await tx.tenderContract.findUnique({ where: { id: win.contractId } });
      if (!contract || contract.status !== "ACTIVE") throw new ConflictException("That supplier's framework agreement is no longer active.");
      const qlines = await tx.tenderCallOffQuoteLine.findMany({ where: { quoteId: win.id } });
      const priced = qlines.map((l) => ({ tenderLineId: l.tenderLineId, quantity: Number(l.quantity), unitPrice: Number(l.quotedPrice), lineTotal: r2(Number(l.quantity) * Number(l.quotedPrice)) }));
      const existing = await tx.tenderCallOff.findMany({ where: { tenderId: t.id, status: { in: OPEN_STATUSES } } });
      const placed = await this.place(tx, user, { t, contract, priced, method: "MINI_COMPETITION", existing, now, stale: [], deliveryCountryCode: c.deliveryCountryCode ?? undefined, requiredBy: c.requiredBy, notes: c.notes, quoteId: win.id });
      await tx.tenderCallOffQuote.update({ where: { id: win.id }, data: { status: "WON" } });
      await tx.tenderCallOffQuote.updateMany({ where: { competitionId: c.id, id: { not: win.id }, status: { in: ["QUOTED", "INVITED"] } }, data: { status: "LOST" } });
      await tx.tenderMiniCompetition.update({ where: { id: c.id }, data: { status: "AWARDED", awardedQuoteId: win.id, awardReason: dto.reason } });
      return { ...placed, c, win, losers: quotes.filter((q) => q.id !== win.id && (q.status === "QUOTED" || q.status === "INVITED")).map((q) => q.awardedOrganizationId) };
    });
    await this.event(out.t, out.win.awardedOrganizationId, user, "MINI_COMP_WON", `Mini-competition ${out.c.reference} awarded to a supplier. Reason: ${dto.reason.slice(0, 300)}`, { competitionId: out.c.id, quoteId: out.win.id });
    for (const org of out.losers) await this.event(out.t, org, user, "MINI_COMP_LOST", `Mini-competition ${out.c.reference} awarded to another supplier`, { competitionId: out.c.id });
    await this.event(out.t, out.co.awardedOrganizationId, user, "CALL_OFF_RAISED", `Call-off ${out.co.reference} raised from mini-competition ${out.c.reference}, ${out.co.status === "PENDING_APPROVAL" ? "awaiting second authorisation" : "sent to the supplier"}`, { callOffId: out.co.id, totalValue: Number(out.co.totalValue), ceilingExceeded: out.co.ceilingExceeded });
    if (out.co.status === "AWAITING_SUPPLIER") await this.tellSupplier(out.t, out.co, user);
    await this.tenders.notifyOrgs(out.losers, () => ({ title: `Mini-competition result: ${out.c.reference}`, body: `The call-off under ${out.t.title} was awarded to another supplier. Thank you for quoting.`, link: `/tenders/framework?id=${out.t.id}`, subjectId: out.t.id }), "TENDER_MINI_COMPETITION", user.id);
    return { id: out.co.id, status: out.co.status, warnings: out.warnings };
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
