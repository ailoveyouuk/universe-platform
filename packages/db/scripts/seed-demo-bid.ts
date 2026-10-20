import { prisma, withPlatformStaffContext, withTenantContext } from "../src/index";

/**
 * One simulated tender and one complete DRAFT bid for the demo organisation (2026-10-20, requested by Lewis).
 * A simulated organisation (not the demo organisation) issues an invite-only RFQ, SIM-TND-001, open to the demo organisation;
 * the demo organisation has declared interest (integrity pledge, no exclusion grounds) and holds a complete draft bid that it
 * can open in the bid editor and submit itself. Nothing is submitted here. DRY_RUN defaults to true. Idempotent.
 */
const dryRun = (process.env.DRY_RUN ?? "true") !== "false";
const DAY = 86400000;
const REF = "SIM-TND-001";

async function main() {
  const demo = await withPlatformStaffContext((tx) => tx.organization.findMany({ where: { isDemo: true, name: "Universe Demo" }, select: { id: true, name: true } }));
  if (demo.length !== 1) throw new Error(`Expected one demo organisation, found ${demo.length}`);
  const bidderId = demo[0].id;
  const issuer = await withPlatformStaffContext((tx) => tx.organization.findFirst({ where: { name: "Andean Care Alliance 106", isSimulated: true, status: { not: "SUSPENDED" } }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true } }));
  if (!issuer) throw new Error("No simulated organisation found to issue the tender.");
  console.log(`Issuer: ${issuer.name}; bidder: ${demo[0].name}`);

  const products = await prisma.productMaster.findMany({ where: { isSimulated: true, isArchived: false }, orderBy: [{ name: "asc" }, { id: "asc" }], take: 40, select: { id: true, name: true } });
  const chosen = [products[3], products[17], products[31]].filter(Boolean);
  if (chosen.length < 3) throw new Error("Not enough simulated products.");

  const existing = await withTenantContext(issuer.id, (tx) => tx.tender.findFirst({ where: { organizationId: issuer.id, referenceNumber: REF }, select: { id: true } }));
  if (existing) console.log(`Tender ${REF} already exists (${existing.id}); will only ensure participation and bid.`);
  if (dryRun) { console.log(`DRY RUN: would ${existing ? "reuse" : "create"} ${REF}, declare interest and create a complete draft bid.`); return; }

  const now = new Date();
  let tenderId = existing?.id;
  if (!tenderId) {
    tenderId = await withTenantContext(issuer.id, async (tx) => {
      const t = await tx.tender.create({ data: {
        organizationId: issuer.id, referenceNumber: REF, title: "Supply of essential medical consumables (simulated RFQ)",
        summary: "Simulated request for quotation for three essential items, delivered to Nairobi. Created to demonstrate bidding.",
        tenderType: "RFQ", visibility: "INVITED_ONLY", visibleToAll: false, isPublished: true, status: "PUBLISHED", publishedAt: new Date(now.getTime() - 2 * DAY),
        deliveryCountryCodes: "KE", currency: "USD", incoterm: "DAP", clientName: "Simulated client", clarificationDeadline: new Date(now.getTime() + 7 * DAY),
        closingAt: new Date(now.getTime() + 14 * DAY), evaluationDueAt: new Date(now.getTime() + 24 * DAY), awardDueAt: new Date(now.getTime() + 30 * DAY),
        bidValidityDays: 90, timeZone: "Europe/London", isSimulated: true,
      } });
      const qty = [12000, 4500, 800];
      for (let i = 0; i < 3; i++) await tx.tenderLine.create({ data: { organizationId: issuer.id, tenderId: t.id, lineNumber: i + 1, productMasterId: chosen[i].id, description: chosen[i].name, quantity: qty[i], unit: "pack", destinationCountryCode: "KE", minShelfLifePercent: 75, coldChainRequired: false } });
      const crit = [
        { title: "Valid wholesale or manufacturing licence", kind: "GATE", weight: null, isMandatory: true, responseFormat: "EITHER", metric: "MANUAL", description: "State the licence number and issuing authority, or upload a copy." },
        { title: "Technical compliance with the specification", kind: "SCORED", weight: 30, isMandatory: true, responseFormat: "TEXT", metric: "MANUAL", description: "Explain how each item meets the stated specification and registrations." },
        { title: "Delivery plan and quality assurance", kind: "SCORED", weight: 20, isMandatory: true, responseFormat: "TEXT", metric: "MANUAL", description: "Describe shipment planning, cold-chain or handling controls and batch documentation." },
        { title: "Price", kind: "SCORED", weight: 50, isMandatory: true, responseFormat: "TEXT", metric: "PRICE", description: "Scored automatically from the prices you enter." },
      ];
      for (let i = 0; i < crit.length; i++) await tx.tenderCriterion.create({ data: { organizationId: issuer.id, tenderId: t.id, sortOrder: i, ...crit[i], weight: crit[i].weight as never } });
      await tx.tenderInvitation.create({ data: { organizationId: issuer.id, tenderId: t.id, invitedOrganizationId: bidderId } });
      return t.id;
    });
    console.log(`Created tender ${REF} (${tenderId}).`);
  }

  await withTenantContext(bidderId, async (tx) => {
    await tx.tenderParticipation.upsert({
      where: { tenderId_organizationId: { tenderId: tenderId!, organizationId: bidderId } },
      create: { organizationId: bidderId, issuerOrganizationId: issuer.id, tenderId: tenderId!, status: "INTERESTED", integrityPledgeAt: now, exclusionDeclaredAt: now, exclusionNoGrounds: true },
      update: {},
    });
    const lines = await tx.tenderLine.findMany({ where: { tenderId: tenderId! }, orderBy: { lineNumber: "asc" }, select: { id: true, lineNumber: true } });
    const criteria = await tx.tenderCriterion.findMany({ where: { tenderId: tenderId!, metric: "MANUAL" }, orderBy: { sortOrder: "asc" }, select: { id: true, title: true } });
    const bid = await tx.tenderBid.upsert({
      where: { tenderId_organizationId: { tenderId: tenderId!, organizationId: bidderId } },
      create: { organizationId: bidderId, issuerOrganizationId: issuer.id, tenderId: tenderId!, status: "DRAFT", bidCurrency: "USD", validityConfirmed: true, validityDays: 90, notes: "Simulated draft bid. Prices are fictional." },
      update: {},
    });
    const prices = [[1.85, 35, "IN", "Careplast Manufacturing (simulated)"], [4.2, 42, "TR", "MediTech Works (simulated)"], [38.5, 56, "DE", "Steriline GmbH (simulated)"]] as const;
    for (const l of lines) {
      const p = prices[l.lineNumber - 1];
      await tx.tenderBidLine.upsert({
        where: { bidId_tenderLineId: { bidId: bid.id, tenderLineId: l.id } },
        create: { organizationId: bidderId, issuerOrganizationId: issuer.id, bidId: bid.id, tenderId: tenderId!, tenderLineId: l.id, noBid: false, unitPrice: p[0], leadTimeDays: p[1], countryOfOrigin: p[2], manufacturerName: p[3], remarks: "Delivered duty paid, 75% minimum remaining shelf life." },
        update: {},
      });
    }
    const answers = [
      "Wholesale distribution licence WDA(H) 99999 (simulated), issued by the national medicines regulator, valid to 2028.",
      "All three items are supplied from manufacturers with current registrations in the destination country. Each item meets the stated specification; registration certificates and certificates of analysis are provided with every batch.",
      "Consolidated sea freight with a 35 to 56 day lead time, ambient storage throughout, batch documentation and certificates of analysis shipped with the goods, and pre-shipment inspection by an independent agent.",
    ];
    for (let i = 0; i < criteria.length; i++) {
      await tx.tenderBidResponse.upsert({
        where: { bidId_criterionId: { bidId: bid.id, criterionId: criteria[i].id } },
        create: { organizationId: bidderId, issuerOrganizationId: issuer.id, bidId: bid.id, tenderId: tenderId!, criterionId: criteria[i].id, text: answers[i] ?? "See attached." },
        update: {},
      });
    }
  });
  console.log("Participation and draft bid ready (not submitted).");
}
main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
