import { createHash, randomUUID } from "node:crypto";
import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * Contract life-cycle history on the simulated framework agreements (2026-10-25, requested by Lewis, baseline data set): for each simulated FRAMEWORK
 * tender with at least two active agreements, adds (each only when that tender has none yet)
 *   - a mini-competition that was run and awarded: two supplier quotes, a winner and a call-off waiting for the supplier;
 *   - contract variations: one accepted and applied (end date extended), one rejected with a reason, one still waiting for an answer;
 *   - price reviews: one accepted, one rejected and one still waiting for an answer.
 * Everything is on the hash-chained tender timeline (events are appended after the current tail so the chain stays unbroken). Nothing is deleted.
 * DRY_RUN defaults to true. Idempotent.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const DAY = 86400000;
interface Fields { prevHash: string | null; id: string; tenderId: string; organizationId: string; counterpartyOrganizationId: string | null; actorOrganizationId: string; actorUserId: string | null; kind: string; summary: string; detailsJson: string | null; createdAt: Date }
const eventHash = (e: Fields) => createHash("sha256").update(JSON.stringify([e.prevHash ?? "", e.id, e.tenderId, e.organizationId, e.counterpartyOrganizationId ?? "", e.actorOrganizationId, e.actorUserId ?? "", e.kind, e.summary, e.detailsJson ?? "", e.createdAt.toISOString()])).digest("hex");
const r2 = (n: number) => Math.round(n * 100) / 100;

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const tenders = await tx.tender.findMany({ where: { isSimulated: true, tenderType: "FRAMEWORK", status: { in: ["AWARDED", "CONTRACTED"] } }, orderBy: { referenceNumber: "asc" }, include: { lines: { orderBy: { lineNumber: "asc" } } } });
    console.log(`${tenders.length} awarded simulated frameworks.`);
    for (const t of tenders) {
      const contracts = await tx.tenderContract.findMany({ where: { tenderId: t.id, status: "ACTIVE" }, orderBy: { reference: "asc" } });
      if (contracts.length < 2 || t.lines.length < 2) { console.log(`${t.referenceNumber}: needs two active agreements and two items; skipped.`); continue; }
      const [c1, c2] = contracts;
      const needMini = (await tx.tenderMiniCompetition.count({ where: { tenderId: t.id } })) === 0;
      const needVar = (await tx.tenderContractVariation.count({ where: { tenderId: t.id } })) === 0;
      const needPrice = (await tx.tenderPriceReview.count({ where: { tenderId: t.id } })) === 0;
      console.log(`${t.referenceNumber}: mini-competition ${needMini ? "to add" : "present"}, variations ${needVar ? "to add" : "present"}, price reviews ${needPrice ? "to add" : "present"}.`);
      if (dryRun || !(needMini || needVar || needPrice)) continue;

      const tail = await tx.$queryRaw<{ hash: string | null; createdAt: Date }[]>`SELECT TOP 1 [hash], [createdAt] FROM [dbo].[tender_events] WHERE [tenderId] = ${t.id} AND [hash] IS NOT NULL ORDER BY [createdAt] DESC, [id] DESC`;
      let prev: string | null = tail[0]?.hash ?? null;
      let at = new Date(Math.max(Date.now(), (tail[0]?.createdAt?.getTime() ?? 0) + 1000));
      const issuer = t.organizationId;
      const event = async (kind: string, summary: string, cp: string, actor: string, details?: unknown) => {
        at = new Date(at.getTime() + 1000);
        const row: Fields = { prevHash: prev, id: randomUUID(), tenderId: t.id, organizationId: issuer, counterpartyOrganizationId: cp, actorOrganizationId: actor, actorUserId: null, kind, summary: summary.slice(0, 500), detailsJson: details ? JSON.stringify(details) : null, createdAt: at };
        const hash = eventHash(row);
        await tx.tenderEvent.create({ data: { ...row, hash } });
        prev = hash;
      };
      const priceOf = async (c: typeof c1, lineId: string) => {
        const aw = await tx.tenderAward.findUnique({ where: { id: c.awardId } });
        const bl = aw ? await tx.tenderBidLine.findFirst({ where: { bidId: aw.bidId, tenderLineId: lineId } }) : null;
        return Number(bl?.unitPrice ?? 1);
      };
      const now = new Date();

      if (needVar) {
        const v1 = await tx.tenderContractVariation.create({ data: { organizationId: issuer, awardedOrganizationId: c1.awardedOrganizationId, tenderId: t.id, contractId: c1.id, number: 1, title: "Extend the agreement by 90 days", reason: "Delivery programme extended by the client; keeping agreed prices for the extra period.", newEndDate: c1.endDate ? new Date(c1.endDate.getTime() + 90 * DAY) : null, previousEndDate: c1.endDate, status: "ACCEPTED", proposedByOrganizationId: issuer, createdAt: new Date(now.getTime() - 30 * DAY), respondedAt: new Date(now.getTime() - 27 * DAY), responseNote: "Agreed.", appliedAt: new Date(now.getTime() - 27 * DAY) } });
        if (c1.endDate) await tx.tenderContract.update({ where: { id: c1.id }, data: { endDate: new Date(c1.endDate.getTime() + 90 * DAY) } });
        await event("VARIATION_PROPOSED", `Variation 1 proposed on contract ${c1.reference}: ${v1.title}`, c1.awardedOrganizationId, issuer);
        await event("VARIATION_ACCEPTED", `Variation 1 on contract ${c1.reference} accepted and applied`, c1.awardedOrganizationId, c1.awardedOrganizationId);
        const v2 = await tx.tenderContractVariation.create({ data: { organizationId: issuer, awardedOrganizationId: c2.awardedOrganizationId, tenderId: t.id, contractId: c2.id, number: 1, title: "Reduce the minimum order quantity", reason: "Supplier asked to lower the minimum call-off quantity because of warehouse constraints.", termsAmendment: "Minimum call-off quantity reduced by half.", status: "REJECTED", proposedByOrganizationId: c2.awardedOrganizationId, createdAt: new Date(now.getTime() - 20 * DAY), respondedAt: new Date(now.getTime() - 18 * DAY), responseNote: "Not accepted: the quantity is needed to hold agreed prices." } });
        await event("VARIATION_PROPOSED", `Variation 1 proposed on contract ${c2.reference}: ${v2.title}`, c2.awardedOrganizationId, c2.awardedOrganizationId);
        await event("VARIATION_REJECTED", `Variation 1 on contract ${c2.reference} rejected: not accepted, the quantity is needed to hold agreed prices.`, c2.awardedOrganizationId, issuer);
        const v3 = await tx.tenderContractVariation.create({ data: { organizationId: issuer, awardedOrganizationId: c1.awardedOrganizationId, tenderId: t.id, contractId: c1.id, number: 2, title: "Add a quarterly delivery review", reason: "Both parties want a regular review of delivery performance.", termsAmendment: "A delivery review meeting is held every quarter.", status: "PROPOSED", proposedByOrganizationId: issuer, createdAt: new Date(now.getTime() - 3 * DAY) } });
        await event("VARIATION_PROPOSED", `Variation 2 proposed on contract ${c1.reference}: ${v3.title}`, c1.awardedOrganizationId, issuer);
      }

      if (needPrice) {
        const mk = async (c: typeof c1, line: (typeof t.lines)[number], factor: number, status: string, by: string, reason: string, note: string | null, daysAgo: number) => {
          const prevPrice = await priceOf(c, line.id);
          const pr = await tx.tenderPriceReview.create({ data: { organizationId: issuer, awardedOrganizationId: c.awardedOrganizationId, tenderId: t.id, contractId: c.id, tenderLineId: line.id, previousPrice: prevPrice, proposedPrice: r2(prevPrice * factor), reason, proposedByOrganizationId: by, status, createdAt: new Date(now.getTime() - daysAgo * DAY), respondedAt: status === "PROPOSED" ? null : new Date(now.getTime() - (daysAgo - 2) * DAY), responseNote: note } });
          await event("PRICE_REVIEW_PROPOSED", `Price review proposed on an item: ${prevPrice} to ${pr.proposedPrice}`, c.awardedOrganizationId, by, { reviewId: pr.id });
          if (status !== "PROPOSED") await event(status === "ACCEPTED" ? "PRICE_REVIEW_ACCEPTED" : "PRICE_REVIEW_REJECTED", `Price review ${status === "ACCEPTED" ? "accepted" : "rejected"}`, c.awardedOrganizationId, by === issuer ? c.awardedOrganizationId : issuer, { reviewId: pr.id });
        };
        await mk(c2, t.lines[0], 1.05, "ACCEPTED", c2.awardedOrganizationId, "Raw material costs have risen since the prices were agreed.", "Accepted for this item only.", 12);
        await mk(c1, t.lines[1], 1.12, "REJECTED", c1.awardedOrganizationId, "Freight costs have increased.", "Rejected: the increase is above the permitted index movement.", 9);
        await mk(c2, t.lines[1], 0.96, "PROPOSED", issuer, "Volumes have grown; the issuer asks for a volume discount.", null, 2);
      }

      if (needMini) {
        const lines = t.lines.slice(0, 2);
        const qty = [4000, 2500];
        const closesAt = new Date(now.getTime() - 20 * DAY);
        const mc = await tx.tenderMiniCompetition.create({ data: { organizationId: issuer, tenderId: t.id, reference: `MC-${t.referenceNumber}-1`, status: "AWARDED", notes: "Urgent top-up order (simulated).", deliveryCountryCode: (t.deliveryCountryCodes ?? "KE").slice(0, 2), requiredBy: new Date(now.getTime() + 30 * DAY), closesAt, linesJson: JSON.stringify(lines.map((l, i) => ({ tenderLineId: l.id, quantity: qty[i] }))), awardReason: "Lowest total price of the two quotes (simulated).", createdById: "00000000-0000-0000-0000-000000000000", createdAt: new Date(now.getTime() - 30 * DAY) } });
        const quotes: { c: typeof c1; id: string; total: number }[] = [];
        for (const [k, c] of [c1, c2].entries()) {
          const fw = await Promise.all(lines.map((l) => priceOf(c, l.id)));
          const quoted = fw.map((p) => r2(p * (k === 0 ? 0.97 : 0.99)));
          const total = r2(quoted.reduce((a, p, i) => a + p * qty[i], 0));
          const q = await tx.tenderCallOffQuote.create({ data: { organizationId: issuer, awardedOrganizationId: c.awardedOrganizationId, tenderId: t.id, competitionId: mc.id, contractId: c.id, reference: mc.reference, status: k === 0 ? "WON" : "LOST", closesAt, requestNotes: mc.notes, deliveryCountryCode: mc.deliveryCountryCode, requiredBy: mc.requiredBy, quotedAt: new Date(now.getTime() - 24 * DAY), totalValue: total, quoteNotes: "Quoted at or below the agreed framework prices (simulated).", createdAt: mc.createdAt } });
          for (let i = 0; i < lines.length; i++) await tx.tenderCallOffQuoteLine.create({ data: { organizationId: issuer, awardedOrganizationId: c.awardedOrganizationId, tenderId: t.id, quoteId: q.id, tenderLineId: lines[i].id, quantity: qty[i], frameworkPrice: fw[i], quotedPrice: quoted[i], leadTimeDays: 28 + k * 6 } });
          quotes.push({ c, id: q.id, total });
          await event("MINI_COMP_INVITED", `Mini-competition ${mc.reference} opened; supplier invited to quote`, c.awardedOrganizationId, issuer, { competitionId: mc.id });
        }
        const win = quotes[0];
        await tx.tenderMiniCompetition.update({ where: { id: mc.id }, data: { awardedQuoteId: win.id } });
        const n = (await tx.tenderCallOff.count({ where: { tenderId: t.id } })) + 1;
        const co = await tx.tenderCallOff.create({ data: { organizationId: issuer, awardedOrganizationId: win.c.awardedOrganizationId, tenderId: t.id, contractId: win.c.id, reference: `CO-${t.referenceNumber}-${n}`, method: "MINI_COMPETITION", status: "AWAITING_SUPPLIER", currency: t.currency, totalValue: win.total, testedValue: win.total, requiresSecondApproval: false, ceilingExceeded: false, deliveryCountryCode: mc.deliveryCountryCode, requiredBy: mc.requiredBy, notes: mc.notes, raisedById: "00000000-0000-0000-0000-000000000000", firstApprovedAt: new Date(now.getTime() - 19 * DAY), quoteId: win.id, createdAt: new Date(now.getTime() - 19 * DAY) } });
        const wq = await tx.tenderCallOffQuoteLine.findMany({ where: { quoteId: win.id } });
        for (const l of wq) await tx.tenderCallOffLine.create({ data: { organizationId: issuer, awardedOrganizationId: win.c.awardedOrganizationId, tenderId: t.id, callOffId: co.id, tenderLineId: l.tenderLineId, quantity: l.quantity, unitPrice: l.quotedPrice ?? l.frameworkPrice, lineTotal: r2(Number(l.quotedPrice ?? l.frameworkPrice) * Number(l.quantity)) } });
        await event("MINI_COMP_WON", `Mini-competition ${mc.reference} awarded; call-off ${co.reference} placed`, win.c.awardedOrganizationId, issuer, { competitionId: mc.id });
        await event("MINI_COMP_LOST", `Mini-competition ${mc.reference}: the call-off was awarded to another supplier`, quotes[1].c.awardedOrganizationId, issuer, { competitionId: mc.id });
      }
    }
    console.log(dryRun ? "DRY RUN: nothing written." : "Written.");
  });
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
