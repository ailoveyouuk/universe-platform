import { prisma, withPlatformStaffContext } from "../src/index";

/**
 * A simulated framework agreement, SIM-FWK-001 (step 7 part 2, 2026-10-22): a FRAMEWORK tender issued by Andean Care Alliance 106, already
 * evaluated and awarded to two suppliers (Universe Demo ranked second and one simulated supplier ranked first), each with a signed, ACTIVE
 * agreement. The agreements were signed 120 days ago and prices are held 90 days, so the hold has ended and a price review can be tried.
 * Call-offs are then raised from the app. Everything is simulated. DRY_RUN defaults to true. Idempotent (skips if the reference exists).
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const REF = process.env.TENDER_REF || "SIM-FWK-001";
const DAY = 86400000;
const QTY = [12000, 8000, 3000];
const OFFSET = Number(process.env.PRODUCT_OFFSET || 0);          // picks different products for further frameworks
const TITLE = process.env.TENDER_TITLE || "Framework for essential medicines and consumables (simulated)";

async function main() {
  await withPlatformStaffContext(async (tx) => {
    const demo = await tx.organization.findFirst({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true } });
    const issuerIsDemo = process.env.ISSUER === "demo";           // Universe Demo issues the framework (to see the issuer side); two simulated suppliers are awarded
    const issuer = issuerIsDemo ? demo : await tx.organization.findFirst({ where: { name: "Andean Care Alliance 106", isSimulated: true }, select: { id: true } });
    if (!demo || !issuer) throw new Error("Universe Demo or Andean Care Alliance 106 not found.");
    const rival = await tx.organization.findFirst({ where: { isSimulated: true, isDemo: false, status: { not: "SUSPENDED" }, id: { not: issuer.id }, type: { in: ["SUPPLIER", "MANUFACTURER"] } }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true } });
    if (!rival) throw new Error("No simulated supplier found.");
    const rival2 = issuerIsDemo ? await tx.organization.findFirst({ where: { isSimulated: true, isDemo: false, status: { not: "SUSPENDED" }, id: { notIn: [issuer.id, rival.id] }, type: { in: ["SUPPLIER", "MANUFACTURER"] } }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true } }) : null;
    if (issuerIsDemo && !rival2) throw new Error("No second simulated supplier found.");
    if (await tx.tender.findFirst({ where: { organizationId: issuer.id, referenceNumber: REF }, select: { id: true } })) { console.log(`${REF} already exists; nothing to do.`); return; }
    const products = await tx.productMaster.findMany({ where: { isSimulated: true, isArchived: false }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 40, select: { id: true, name: true } });
    const chosen = [products[10 + OFFSET], products[18 + OFFSET], products[30 - OFFSET]].filter(Boolean);
    if (chosen.length < 3) throw new Error("Not enough simulated products.");
    console.log(`${dryRun ? "DRY RUN: would create" : "Creating"} ${REF} for Andean Care Alliance 106, awarded to ${rival.name} (rank 1) and Universe Demo (rank 2).`);
    if (dryRun) return;

    const now = new Date();
    const t = await tx.tender.create({ data: {
      organizationId: issuer.id, referenceNumber: REF, title: TITLE,
      summary: "Simulated two-year framework agreement for three items, awarded to two suppliers. Call-offs are placed by rotation.", tenderType: "FRAMEWORK", visibility: "INVITED_ONLY", visibleToAll: false,
      isPublished: true, status: "AWARDED", publishedAt: new Date(now.getTime() - 200 * DAY), deliveryCountryCodes: "KE", currency: "USD", incoterm: "DAP", clientName: "Simulated client",
      closingAt: new Date(now.getTime() - 170 * DAY), bidValidityDays: 90, timeZone: "Europe/London", isSimulated: true, bidsOpenedAt: new Date(now.getTime() - 169 * DAY), evaluationStartedAt: new Date(now.getTime() - 165 * DAY),
      scoringFinalisedAt: new Date(now.getTime() - 150 * DAY), awardedAt: new Date(now.getTime() - 140 * DAY), contractStartDate: new Date(now.getTime() - 120 * DAY),
      frameworkTermMonths: 24, frameworkCeiling: 150000, frameworkCallOffMethod: "ROTATION", frameworkPriceHoldDays: 90,
    } });
    const lines = [];
    for (let i = 0; i < 3; i++) lines.push(await tx.tenderLine.create({ data: { organizationId: issuer.id, tenderId: t.id, lineNumber: i + 1, productMasterId: chosen[i].id, description: chosen[i].name, quantity: QTY[i], unit: "pack", destinationCountryCode: "KE" } }));
    const suppliers = [
      { org: rival.id, rank: 1, prices: [1.18, 3.05, 23.5], score: 91 },
      { org: issuerIsDemo ? rival2!.id : demo.id, rank: 2, prices: [1.26, 3.2, 25.0], score: 84 },
    ];
    for (const s of suppliers) {
      const total = s.prices.reduce((a, p, i) => a + p * QTY[i], 0);
      await tx.tenderInvitation.create({ data: { organizationId: issuer.id, tenderId: t.id, invitedOrganizationId: s.org } });
      const bid = await tx.tenderBid.create({ data: { organizationId: s.org, issuerOrganizationId: issuer.id, tenderId: t.id, status: "SUBMITTED", submittedAt: new Date(now.getTime() - 171 * DAY), bidCurrency: "USD", validityConfirmed: true, fxRate: 1, fxRateDate: new Date(now.getTime() - 171 * DAY), totalBidCurrency: total, totalTenderCurrency: total } });
      for (let i = 0; i < 3; i++) await tx.tenderBidLine.create({ data: { organizationId: s.org, issuerOrganizationId: issuer.id, bidId: bid.id, tenderId: t.id, tenderLineId: lines[i].id, noBid: false, unitPrice: s.prices[i], leadTimeDays: 30 + i * 5, countryOfOrigin: "IN" } });
      const award = await tx.tenderAward.create({ data: { organizationId: issuer.id, tenderId: t.id, bidId: bid.id, awardedOrganizationId: s.org, reason: s.rank === 1 ? "Best overall score (simulated)." : "Second-ranked supplier retained for supply security (simulated)." } });
      for (const l of lines) await tx.tenderAwardLine.create({ data: { organizationId: issuer.id, awardedOrganizationId: s.org, tenderId: t.id, awardId: award.id, tenderLineId: l.id, sharePercent: 50 } });
      await tx.tenderDebrief.create({ data: { organizationId: issuer.id, tenderId: t.id, bidId: bid.id, bidderOrganizationId: s.org, outcome: "AWARDED", totalScore: s.score, rank: s.rank, bidCount: 2, scoresJson: "[]" } });
      await tx.tenderContract.create({ data: {
        organizationId: issuer.id, awardedOrganizationId: s.org, tenderId: t.id, awardId: award.id, reference: `CON-${REF}-${s.rank}`, title: `Framework agreement for ${t.title}`, status: "ACTIVE", currency: "USD",
        startDate: new Date(now.getTime() - 120 * DAY), endDate: new Date(now.getTime() + 610 * DAY), sentAt: new Date(now.getTime() - 125 * DAY), executedAt: new Date(now.getTime() - 120 * DAY),
      } });
    }
    console.log(`Created ${REF}.`);
  });
}
main().then(() => prisma.$disconnect()).catch((e) => { console.error(e); process.exit(1); });
