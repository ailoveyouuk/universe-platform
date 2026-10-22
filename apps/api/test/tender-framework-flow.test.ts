import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { TenderFrameworkService } from "../src/tenders/tender-framework.service";
import { TendersService } from "../src/tenders/tenders.service";

/** The framework call-off flow end to end against a real RLS database (2026-10-22): rotation, approval limit with a second authoriser, ceiling warning, price hold and review, supplier accept/decline, supplier isolation. */
describe("Framework call-off flow", () => {
  const suffix = randomUUID().slice(0, 8);
  const fw = new TenderFrameworkService(new TendersService());
  let owner: string; let supA: string; let supB: string; let tenderId: string; let cA: string; let cB: string; let l1: string; let l2: string;
  const DAY = 86_400_000;
  const user = (organizationId: string, id: string, permissions: string[]): RequestUser => ({
    id, organizationId, homeOrganizationId: organizationId, email: `${id}@example.com`, forename: "T", surname: id, organizationName: "Org", organizationLogoUrl: null, organizationLogoIconUrl: null,
    organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null, platformStaffRole: "NONE", permissions,
  } as unknown as RequestUser);
  const OWN = ["tenders.view", "tenders.award"]; const SUP = ["tenders.view", "tenders.bid"];
  let raiser: RequestUser; let second: RequestUser; let uA: RequestUser; let uB: RequestUser;

  beforeAll(async () => {
    owner = (await createOrganizationWithDefaultRoles({ name: `FW Owner ${suffix}`, slug: `fw-own-${suffix}`, type: "TENDERING_PURCHASING_BODY" })).id;
    supA = (await createOrganizationWithDefaultRoles({ name: `FW SupA ${suffix}`, slug: `fw-a-${suffix}`, type: "SUPPLIER" })).id;
    supB = (await createOrganizationWithDefaultRoles({ name: `FW SupB ${suffix}`, slug: `fw-b-${suffix}`, type: "SUPPLIER" })).id;
    raiser = user(owner, `raiser-${suffix}`, OWN); second = user(owner, `second-${suffix}`, OWN); uA = user(supA, `ua-${suffix}`, SUP); uB = user(supB, `ub-${suffix}`, SUP);
    const now = Date.now();
    await withPlatformStaffContext(async (tx) => {
      const t = await tx.tender.create({ data: { organizationId: owner, referenceNumber: `FWK-${suffix}`, title: "Framework test", tenderType: "FRAMEWORK", isPublished: true, visibleToAll: true, status: "AWARDED", currency: "USD",
        awardedAt: new Date(now - 140 * DAY), frameworkTermMonths: 24, frameworkCeiling: 5000, frameworkCallOffMethod: "ROTATION", frameworkPriceHoldDays: 90, isSimulated: true } });
      tenderId = t.id;
      const lines = [];
      for (let i = 0; i < 2; i++) lines.push(await tx.tenderLine.create({ data: { organizationId: owner, tenderId, lineNumber: i + 1, description: `Item ${i + 1}`, quantity: 1000, unit: "pack" } }));
      l1 = lines[0].id; l2 = lines[1].id;
      for (const [org, rank, prices] of [[supA, 1, [10, 20]], [supB, 2, [12, 18]]] as const) {
        const bid = await tx.tenderBid.create({ data: { organizationId: org, issuerOrganizationId: owner, tenderId, status: "SUBMITTED", submittedAt: new Date(now - 171 * DAY), bidCurrency: "USD", validityConfirmed: true, fxRate: 1, totalBidCurrency: 1, totalTenderCurrency: 1 } });
        for (let i = 0; i < 2; i++) await tx.tenderBidLine.create({ data: { organizationId: org, issuerOrganizationId: owner, bidId: bid.id, tenderId, tenderLineId: lines[i].id, noBid: false, unitPrice: prices[i], leadTimeDays: 30, countryOfOrigin: "IN" } });
        const award = await tx.tenderAward.create({ data: { organizationId: owner, tenderId, bidId: bid.id, awardedOrganizationId: org, reason: "Test" } });
        for (const l of lines) await tx.tenderAwardLine.create({ data: { organizationId: owner, awardedOrganizationId: org, tenderId, awardId: award.id, tenderLineId: l.id, sharePercent: 50 } });
        await tx.tenderDebrief.create({ data: { organizationId: owner, tenderId, bidId: bid.id, bidderOrganizationId: org, outcome: "AWARDED", rank, bidCount: 2, scoresJson: "[]" } });
        const c = await tx.tenderContract.create({ data: { organizationId: owner, awardedOrganizationId: org, tenderId, awardId: award.id, reference: `CON-${suffix}-${rank}`, title: "Agreement", status: "ACTIVE", currency: "USD", executedAt: new Date(now - 120 * DAY), endDate: new Date(now + 600 * DAY) } });
        if (org === supA) cA = c.id; else cB = c.id;
      }
    });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  let first: string; let secondCo: string; let big: string;

  it("rotation starts with the best-ranked supplier and then moves to the other; prices come from the bid; a small order needs no second authoriser", async () => {
    const r1 = await fw.raise(raiser, tenderId, { lines: [{ tenderLineId: l1, quantity: 100 }] });
    expect(r1.status).toBe("AWAITING_SUPPLIER");
    expect(r1.warnings.join(" ")).toMatch(/price-hold period has ended/);
    first = r1.id;
    const r2 = await fw.raise(raiser, tenderId, { lines: [{ tenderLineId: l1, quantity: 100 }] });
    secondCo = r2.id;
    const v = await fw.view(raiser, tenderId);
    const a = v.callOffs.find((c) => c.id === first)!; const b = v.callOffs.find((c) => c.id === secondCo)!;
    expect(a.supplierName).toContain("SupA"); expect(a.totalValue).toBe(1000);
    expect(b.supplierName).toContain("SupB"); expect(b.totalValue).toBe(1200);
  });

  it("a large order, counted with recent orders to the same supplier, needs a second and different authoriser, and is flagged over the ceiling without being blocked", async () => {
    const r = await fw.raise(raiser, tenderId, { lines: [{ tenderLineId: l1, quantity: 3000 }] });
    big = r.id;
    expect(r.status).toBe("PENDING_APPROVAL");
    expect(r.warnings.join(" ")).toMatch(/second, different authoriser/);
    expect(r.warnings.join(" ")).toMatch(/maximum value/);
    await expect(fw.approve(raiser, big)).rejects.toThrow(/someone other than the person who raised/);
    await fw.approve(second, big);
    const v = await fw.view(raiser, tenderId);
    const co = v.callOffs.find((c) => c.id === big)!;
    expect(co.status).toBe("AWAITING_SUPPLIER"); expect(co.ceilingExceeded).toBe(true); expect(co.requiresSecondApproval).toBe(true);
    expect(v.ceiling?.remaining).toBeLessThan(0);
  });

  it("each supplier sees only its own agreement and call-offs, and no ceiling", async () => {
    const vb = await fw.view(uB, tenderId);
    expect(vb.viewer.party).toBe("SUPPLIER"); expect(vb.ceiling).toBeNull();
    expect(vb.contracts.length).toBe(1); expect(vb.callOffs.every((c) => c.supplierName?.includes("SupB"))).toBe(true);
    await expect(fw.respond(uB, first, true)).rejects.toThrow();            // another supplier's call-off
    await expect(fw.approve(uA, big)).rejects.toThrow();                    // a supplier cannot authorise
  });

  it("the supplier accepts, or declines with a reason", async () => {
    await expect(fw.respond(uB, secondCo, false)).rejects.toThrow(/reason/);
    await fw.respond(uA, first, true);
    await fw.respond(uA, big, true);
    await fw.respond(uB, secondCo, false, "No capacity");
    const v = await fw.view(raiser, tenderId);
    expect(v.callOffs.find((c) => c.id === first)!.status).toBe("ACCEPTED");
    expect(v.callOffs.find((c) => c.id === secondCo)!.status).toBe("DECLINED");
    await expect(fw.respond(uA, first, true)).rejects.toThrow(/not waiting/);
  });

  it("a price review is refused while prices are held, then proposed, answered by the other party, and used for the next call-off", async () => {
    await withTenantContext(owner, (tx) => tx.tenderContract.update({ where: { id: cB }, data: { executedAt: new Date() } }));
    await expect(fw.proposePrice(raiser, cB, { tenderLineId: l1, proposedPrice: 13, reason: "Input costs" })).rejects.toThrow(/held until/);
    await withTenantContext(owner, (tx) => tx.tenderContract.update({ where: { id: cB }, data: { executedAt: new Date(Date.now() - 120 * DAY) } }));
    const v1 = await fw.proposePrice(raiser, cB, { tenderLineId: l1, proposedPrice: 13, reason: "Input costs" });
    const review = v1.priceReviews[0];
    await expect(fw.proposePrice(raiser, cB, { tenderLineId: l1, proposedPrice: 14, reason: "Again" })).rejects.toThrow(/already waiting/);
    await expect(fw.respondPrice(raiser, review.id, { accept: true })).rejects.toThrow(/other party/);
    await fw.respondPrice(uB, review.id, { accept: true });
    const r = await fw.raise(raiser, tenderId, { lines: [{ tenderLineId: l1, quantity: 100 }] });   // B has no open call-offs now, so rotation picks B at the reviewed price
    const v = await fw.view(raiser, tenderId);
    const co = v.callOffs.find((c) => c.id === r.id)!;
    expect(co.supplierName).toContain("SupB"); expect(co.totalValue).toBe(1300);
    expect(v.contracts.find((c) => c.contractId === cB)!.items.find((i) => i.tenderLineId === l1)!.price).toBe(13);
  });

  it("the approval limit is per organisation and can be changed", async () => {
    expect((await fw.getSettings(raiser)).confirmed).toBe(false);
    const s = await fw.saveSettings(raiser, { individualLimit: 500, splitWindowDays: 7 });
    expect(s).toMatchObject({ individualLimit: 500, splitWindowDays: 7, confirmed: true });
    const r = await fw.raise(raiser, tenderId, { lines: [{ tenderLineId: l2, quantity: 100 }] });
    expect(r.status).toBe("PENDING_APPROVAL");
    await fw.reject(raiser, r.id, "Not needed", true);
    const v = await fw.view(raiser, tenderId);
    expect(v.callOffs.find((c) => c.id === r.id)!.status).toBe("CANCELLED");
  });
  it("mini-competition: invited suppliers quote sealed, only at or below their framework price; the owner reads quotes after closing, awards with a reason, and the win becomes a normal call-off", async () => {
    const soon = new Date(Date.now() + 3 * DAY).toISOString();
    await expect(fw.openCompetition(raiser, tenderId, { lines: [{ tenderLineId: l1, quantity: 50 }], closesAt: new Date(Date.now() - 1000).toISOString() })).rejects.toThrow(/future/);
    const opened = await fw.openCompetition(raiser, tenderId, { lines: [{ tenderLineId: l1, quantity: 50 }, { tenderLineId: l2, quantity: 50 }], closesAt: soon, notes: "Urgent" });
    const comp = opened.miniCompetitions[0];
    expect(comp.invited).toBe(2); expect(comp.sealed).toBe(true); expect(comp.quotes).toEqual([]);
    const ia = (await fw.view(uA, tenderId)).invitations[0]; const ib = (await fw.view(uB, tenderId)).invitations[0];
    expect(ia.lines.find((l) => l.tenderLineId === l1)!.frameworkPrice).toBe(10);
    expect(ib.lines.find((l) => l.tenderLineId === l1)!.frameworkPrice).toBe(13);      // B's price after its accepted review
    expect((await fw.view(uA, tenderId)).miniCompetitions).toEqual([]);
    await expect(fw.submitQuote(uA, ib.id, { lines: [{ tenderLineId: l1, quotedPrice: 5 }, { tenderLineId: l2, quotedPrice: 5 }] })).rejects.toThrow();   // someone else's invitation
    await expect(fw.submitQuote(uA, ia.id, { lines: [{ tenderLineId: l1, quotedPrice: 10.5 }, { tenderLineId: l2, quotedPrice: 19 }] })).rejects.toThrow(/cannot be higher/);
    await expect(fw.submitQuote(uA, ia.id, { lines: [{ tenderLineId: l1, quotedPrice: 9 }] })).rejects.toThrow(/Enter a price/);
    await fw.submitQuote(uA, ia.id, { lines: [{ tenderLineId: l1, quotedPrice: 9.5 }, { tenderLineId: l2, quotedPrice: 19 }] });
    await fw.submitQuote(uA, ia.id, { lines: [{ tenderLineId: l1, quotedPrice: 9 }, { tenderLineId: l2, quotedPrice: 19 }], notes: "Best price" });   // replaced before the deadline
    await fw.submitQuote(uB, ib.id, { lines: [{ tenderLineId: l1, quotedPrice: 12 }, { tenderLineId: l2, quotedPrice: 17 }] });
    const sealed = (await fw.view(raiser, tenderId)).miniCompetitions[0];
    expect(sealed.quotesReceived).toBe(2); expect(sealed.quotes).toEqual([]); expect(sealed.canAward).toBe(false);
    await expect(fw.awardCompetition(raiser, comp.id, { quoteId: ia.id, reason: "Cheapest" })).rejects.toThrow(/sealed/);
    await fw.closeCompetition(raiser, comp.id);
    await expect(fw.submitQuote(uB, ib.id, { lines: [{ tenderLineId: l1, quotedPrice: 1 }, { tenderLineId: l2, quotedPrice: 1 }] })).rejects.toThrow(/closed/);
    const open = (await fw.view(raiser, tenderId)).miniCompetitions[0];
    expect(open.sealed).toBe(false); expect(open.quotes.length).toBe(2); expect(open.canAward).toBe(true);
    expect(open.quotes.find((q) => q.supplierName?.includes("SupA"))!.totalValue).toBe(1400);
    expect(open.quotes.find((q) => q.supplierName?.includes("SupB"))!.totalValue).toBe(1450);
    await expect(fw.awardCompetition(raiser, comp.id, { quoteId: ia.id, reason: "x" })).rejects.toThrow();
    const won = await fw.awardCompetition(raiser, comp.id, { quoteId: ia.id, reason: "Lowest total price" });
    expect(won.status).toBe("PENDING_APPROVAL");            // the limit set in the previous test is 500, so a second authoriser is needed
    const v = await fw.view(raiser, tenderId);
    const co = v.callOffs.find((c) => c.id === won.id)!;
    expect(co.method).toBe("MINI_COMPETITION"); expect(co.totalValue).toBe(1400); expect(co.supplierName).toContain("SupA");
    expect(v.miniCompetitions[0]).toMatchObject({ status: "AWARDED", awardReason: "Lowest total price" });
    expect((await fw.view(uB, tenderId)).invitations[0].status).toBe("LOST");
    expect((await fw.view(uA, tenderId)).invitations[0].status).toBe("WON");
    expect(JSON.stringify(await fw.view(uB, tenderId))).not.toContain("Best price");
    await expect(fw.awardCompetition(raiser, comp.id, { quoteId: ia.id, reason: "Again please" })).rejects.toThrow(/no longer open/);
  });

  it("a mini-competition can be cancelled, a supplier can decline to quote, and one with fewer than two eligible suppliers is refused", async () => {
    const o = await fw.openCompetition(raiser, tenderId, { lines: [{ tenderLineId: l1, quantity: 10 }], closesAt: new Date(Date.now() + 2 * DAY).toISOString() });
    const comp = o.miniCompetitions.find((m) => m.status === "OPEN")!;
    const ib = (await fw.view(uB, tenderId)).invitations.find((i) => i.status === "INVITED")!;
    await expect(fw.declineQuote(uB, ib.id, "")).rejects.toThrow();
    await fw.declineQuote(uB, ib.id, "No stock");
    await fw.cancelCompetition(raiser, comp.id, "Need changed");
    const ia = (await fw.view(uA, tenderId)).invitations.find((i) => i.reference === comp.reference)!;
    expect(ia.status).toBe("CANCELLED");
    await expect(fw.submitQuote(uA, ia.id, { lines: [{ tenderLineId: l1, quotedPrice: 9 }] })).rejects.toThrow(/closed/);
    await withTenantContext(owner, (tx) => tx.tenderContract.update({ where: { id: cB }, data: { status: "CLOSED" } }));
    await expect(fw.openCompetition(raiser, tenderId, { lines: [{ tenderLineId: l1, quantity: 10 }], closesAt: new Date(Date.now() + DAY).toISOString() })).rejects.toThrow(/at least 2/);
  });
});
