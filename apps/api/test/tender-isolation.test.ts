import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withTenantContext, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Tender Issuance & Management, step 1a (2026-10-19): the database policies in infra/sql/tender-rls.sql. A draft is private to
 * the issuer; a published tender is readable by registered organisations (or only invited ones); participant rows are readable
 * by the issuer but not by other participants; only owners write; the shared timeline is appendable by either party.
 */
describe("Tender row-level security", () => {
  const suffix = randomUUID().slice(0, 8);
  let issuer: string; let partA: string; let partB: string; let outsider: string;
  let draftId: string; let openId: string; let invitedId: string;

  const mkTender = (tx: Parameters<Parameters<typeof withTenantContext>[1]>[0], ref: string, over: Record<string, unknown>) =>
    tx.tender.create({ data: { organizationId: issuer, referenceNumber: `${ref}-${suffix}`, title: `Tender ${ref}`, ...over } });

  beforeAll(async () => {
    issuer = (await createOrganizationWithDefaultRoles({ name: `Issuer ${suffix}`, slug: `iss-${suffix}` })).id;
    partA = (await createOrganizationWithDefaultRoles({ name: `PartA ${suffix}`, slug: `pa-${suffix}` })).id;
    partB = (await createOrganizationWithDefaultRoles({ name: `PartB ${suffix}`, slug: `pb-${suffix}` })).id;
    outsider = (await createOrganizationWithDefaultRoles({ name: `Out ${suffix}`, slug: `out-${suffix}` })).id;
    await withTenantContext(issuer, async (tx) => {
      draftId = (await mkTender(tx, "DRAFT", {})).id;
      openId = (await mkTender(tx, "OPEN", { isPublished: true, visibleToAll: true, status: "PUBLISHED", visibility: "ELIGIBLE_ORGANISATIONS" })).id;
      invitedId = (await mkTender(tx, "INV", { isPublished: true, visibleToAll: false, status: "PUBLISHED", visibility: "INVITED_ONLY" })).id;
      for (const [tid, n] of [[draftId, 1], [openId, 1], [invitedId, 1]] as const) {
        await tx.tenderLine.create({ data: { organizationId: issuer, tenderId: tid, lineNumber: n, description: `Line for ${tid.slice(0, 4)}` } });
      }
      await tx.tenderInvitation.create({ data: { organizationId: issuer, tenderId: invitedId, invitedOrganizationId: partA } });
    });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  const titles = (org: string) => withTenantContext(org, async (tx) => (await tx.tender.findMany({ where: { referenceNumber: { endsWith: suffix } }, orderBy: { referenceNumber: "asc" } })).map((t) => t.referenceNumber.split("-")[0]));
  const lineCount = (org: string) => withTenantContext(org, (tx) => tx.tenderLine.count({ where: { tender: { referenceNumber: { endsWith: suffix } } } }));

  it("a draft is visible only to its issuer", async () => {
    expect(await titles(issuer)).toEqual(["DRAFT", "INV", "OPEN"]);
    expect(await titles(outsider)).not.toContain("DRAFT");
  });

  it("a published tender is visible to every registered organisation; an invited-only one only to the invited", async () => {
    expect(await titles(partA)).toEqual(["INV", "OPEN"]);
    expect(await titles(partB)).toEqual(["OPEN"]);
    expect(await titles(outsider)).toEqual(["OPEN"]);
  });

  it("lines follow the parent tender's visibility", async () => {
    expect(await lineCount(issuer)).toBe(3);
    expect(await lineCount(partA)).toBe(2);
    expect(await lineCount(partB)).toBe(1);
  });

  it("a connection with no session sees no tenders; platform staff see all", async () => {
    expect(await prisma.tender.count({ where: { referenceNumber: { endsWith: suffix } } })).toBe(0);
    expect(await withPlatformStaffContext((tx) => tx.tender.count({ where: { referenceNumber: { endsWith: suffix } } }))).toBe(3);
  });

  it("a participant cannot create or change an issuer's tender", async () => {
    await expect(withTenantContext(partA, (tx) => tx.tender.create({ data: { organizationId: issuer, referenceNumber: `X-${suffix}`, title: "forged" } }))).rejects.toThrow();
    // The row is readable to the participant, but the database refuses the write.
    await expect(withTenantContext(partA, (tx) => tx.tender.updateMany({ where: { id: openId }, data: { title: "hijacked" } }))).rejects.toThrow();
    const after = await withTenantContext(issuer, (tx) => tx.tender.findUnique({ where: { id: openId } }));
    expect(after?.title).toBe("Tender OPEN");
  });

  it("participation and questions are readable by the issuer and the participant only", async () => {
    await withTenantContext(partA, async (tx) => {
      await tx.tenderParticipation.create({ data: { organizationId: partA, issuerOrganizationId: issuer, tenderId: openId } });
      await tx.tenderQuestion.create({ data: { organizationId: partA, issuerOrganizationId: issuer, tenderId: openId, question: "Is partial supply accepted?" } });
    });
    for (const [org, expected] of [[issuer, 1], [partA, 1], [partB, 0], [outsider, 0]] as const) {
      expect(await withTenantContext(org, (tx) => tx.tenderParticipation.count({ where: { tenderId: openId } }))).toBe(expected);
      expect(await withTenantContext(org, (tx) => tx.tenderQuestion.count({ where: { tenderId: openId } }))).toBe(expected);
    }
    // Another participant cannot write a row in the first participant's name.
    await expect(withTenantContext(partB, (tx) => tx.tenderParticipation.create({ data: { organizationId: partA, issuerOrganizationId: issuer, tenderId: invitedId } }))).rejects.toThrow();
  });

  it("the issuer's published clarification is visible to anyone who can see the tender", async () => {
    await withTenantContext(issuer, (tx) => tx.tenderClarification.create({ data: { organizationId: issuer, tenderId: openId, question: "Partial supply?", answer: "Yes, per lot." } }));
    expect(await withTenantContext(partB, (tx) => tx.tenderClarification.count({ where: { tenderId: openId } }))).toBe(1);
    expect(await withTenantContext(partB, (tx) => tx.tenderClarification.count({ where: { tenderId: invitedId } }))).toBe(0);
  });

  it("eligibility checks are visible to the issuer and the checked organisation only; shortlists are private", async () => {
    await withTenantContext(partA, async (tx) => {
      await tx.tenderEligibilityCheck.create({ data: { organizationId: partA, issuerOrganizationId: issuer, tenderId: openId, outcome: "ALMOST", detailsJson: "[]" } });
      await tx.tenderShortlist.create({ data: { organizationId: partA, tenderId: openId } });
    });
    expect(await withTenantContext(issuer, (tx) => tx.tenderEligibilityCheck.count({ where: { tenderId: openId } }))).toBe(1);
    expect(await withTenantContext(partB, (tx) => tx.tenderEligibilityCheck.count({ where: { tenderId: openId } }))).toBe(0);
    expect(await withTenantContext(issuer, (tx) => tx.tenderShortlist.count({ where: { tenderId: openId } }))).toBe(0);
    expect(await withTenantContext(partA, (tx) => tx.tenderShortlist.count({ where: { tenderId: openId } }))).toBe(1);
  });

  it("either party can append to the shared timeline; a third party cannot read or forge it", async () => {
    await withTenantContext(issuer, (tx) => tx.tenderEvent.create({ data: { organizationId: issuer, counterpartyOrganizationId: partA, tenderId: openId, actorOrganizationId: issuer, kind: "INVITED", summary: "Invited" } }));
    await withTenantContext(partA, (tx) => tx.tenderEvent.create({ data: { organizationId: issuer, counterpartyOrganizationId: partA, tenderId: openId, actorOrganizationId: partA, kind: "OPTED_IN", summary: "Opted in" } }));
    expect(await withTenantContext(issuer, (tx) => tx.tenderEvent.count({ where: { tenderId: openId } }))).toBe(2);
    expect(await withTenantContext(partA, (tx) => tx.tenderEvent.count({ where: { tenderId: openId } }))).toBe(2);
    expect(await withTenantContext(partB, (tx) => tx.tenderEvent.count({ where: { tenderId: openId } }))).toBe(0);
    await expect(withTenantContext(partB, (tx) => tx.tenderEvent.create({ data: { organizationId: issuer, counterpartyOrganizationId: partA, tenderId: openId, actorOrganizationId: partB, kind: "FORGED", summary: "no" } }))).rejects.toThrow();
  });
  it("a performance record, its responses and the payment log are shared by the issuer and the awarded supplier only", async () => {
    const suffix = randomUUID().slice(0, 8);
    const c = await withTenantContext(issuer, (tx) => tx.tenderContract.create({ data: { organizationId: issuer, awardedOrganizationId: partA, tenderId: openId, awardId: randomUUID(), reference: `CON-P-${suffix}`, title: "Contract", status: "COMPLETED" } }));
    const rec = await withTenantContext(issuer, (tx) => tx.tenderPerformanceRecord.create({ data: { organizationId: issuer, awardedOrganizationId: partA, tenderId: openId, contractId: c.id, outcome: "COMPLETED", closedAt: new Date(), measuresJson: "[]", band: "NOT_ENOUGH_DATA", replyDeadline: new Date() } }));
    await withTenantContext(partA, (tx) => tx.tenderPerformanceResponse.create({ data: { organizationId: issuer, awardedOrganizationId: partA, tenderId: openId, recordId: rec.id, kind: "REPLY", body: "Noted", byOrganizationId: partA } }));
    await withTenantContext(partA, (tx) => tx.tenderContractPayment.create({ data: { organizationId: issuer, awardedOrganizationId: partA, tenderId: openId, contractId: c.id, reference: "INV-1", amount: 10, dueDate: new Date(), recordedByOrganizationId: partA } }));
    for (const org of [issuer, partA]) {
      expect(await withTenantContext(org, (tx) => tx.tenderPerformanceRecord.count({ where: { id: rec.id } }))).toBe(1);
      expect(await withTenantContext(org, (tx) => tx.tenderPerformanceResponse.count({ where: { recordId: rec.id } }))).toBe(1);
      expect(await withTenantContext(org, (tx) => tx.tenderContractPayment.count({ where: { contractId: c.id } }))).toBe(1);
    }
    expect(await withTenantContext(partB, (tx) => tx.tenderPerformanceRecord.count({ where: { id: rec.id } }))).toBe(0);
    expect(await withTenantContext(partB, (tx) => tx.tenderPerformanceResponse.count({ where: { recordId: rec.id } }))).toBe(0);
    expect(await withTenantContext(partB, (tx) => tx.tenderContractPayment.count({ where: { contractId: c.id } }))).toBe(0);
    await expect(withTenantContext(partB, (tx) => tx.tenderContractPayment.create({ data: { organizationId: issuer, awardedOrganizationId: partA, tenderId: openId, contractId: c.id, reference: "X", amount: 1, dueDate: new Date(), recordedByOrganizationId: partB } }))).rejects.toThrow();
  });

  it("a contract is shared by the issuer and the awarded supplier only; the supplier may write to it, a third party may not read or write", async () => {
    const awardId = randomUUID();
    const c = await withTenantContext(issuer, (tx) => tx.tenderContract.create({ data: { organizationId: issuer, awardedOrganizationId: partA, tenderId: openId, awardId, reference: `CON-${suffix}`, title: "Contract" } }));
    await withTenantContext(issuer, (tx) => tx.tenderContractSignatory.create({ data: { organizationId: issuer, awardedOrganizationId: partA, tenderId: openId, contractId: c.id, party: "ISSUER", signerName: "A", signedOn: new Date(), recordedByOrganizationId: issuer } }));
    expect(await withTenantContext(issuer, (tx) => tx.tenderContract.count({ where: { id: c.id } }))).toBe(1);
    expect(await withTenantContext(partA, (tx) => tx.tenderContract.count({ where: { id: c.id } }))).toBe(1);
    expect(await withTenantContext(partA, (tx) => tx.tenderContractSignatory.count({ where: { contractId: c.id } }))).toBe(1);
    expect(await withTenantContext(partB, (tx) => tx.tenderContract.count({ where: { id: c.id } }))).toBe(0);
    expect(await withTenantContext(partB, (tx) => tx.tenderContractSignatory.count({ where: { contractId: c.id } }))).toBe(0);
    await withTenantContext(partA, (tx) => tx.tenderContractSignatory.create({ data: { organizationId: issuer, awardedOrganizationId: partA, tenderId: openId, contractId: c.id, party: "SUPPLIER", signerName: "B", signedOn: new Date(), recordedByOrganizationId: partA } }));
    expect(await withTenantContext(issuer, (tx) => tx.tenderContractSignatory.count({ where: { contractId: c.id } }))).toBe(2);
    await expect(withTenantContext(partB, (tx) => tx.tenderContractSignatory.create({ data: { organizationId: issuer, awardedOrganizationId: partA, tenderId: openId, contractId: c.id, party: "SUPPLIER", signerName: "X", signedOn: new Date(), recordedByOrganizationId: partB } }))).rejects.toThrow();
  });
  it("a bidder's per-lot debrief is readable by that bidder and the issuer only, and a bidder cannot write or alter it", async () => {
    const lotsA = JSON.stringify([{ lotNumber: 1, lotTitle: "Medicines", bid: true, rank: 1, of: 2, itemsAwarded: 2, itemsInLot: 2 }]);
    const lotsB = JSON.stringify([{ lotNumber: 1, lotTitle: "Medicines", bid: true, rank: 2, of: 2, itemsAwarded: 0, itemsInLot: 2 }]);
    const mk = (bidder: string, lots: string) => withTenantContext(issuer, (tx) => tx.tenderDebrief.create({ data: { organizationId: issuer, tenderId: openId, bidId: randomUUID(), bidderOrganizationId: bidder, outcome: "AWARDED", scoresJson: "[]", lotsJson: lots } }));
    const dA = await mk(partA, lotsA); const dB = await mk(partB, lotsB);
    const read = (org: string) => withTenantContext(org, async (tx) => (await tx.tenderDebrief.findMany({ where: { tenderId: openId } })).map((d) => d.lotsJson).sort());
    expect(await read(partA)).toEqual([lotsA]);
    expect(await read(partB)).toEqual([lotsB]);
    expect((await read(issuer)).sort()).toEqual([lotsA, lotsB].sort());
    expect(await read(outsider)).toEqual([]);
    await expect(withTenantContext(partA, (tx) => tx.tenderDebrief.update({ where: { id: dA.id }, data: { lotsJson: lotsB } }))).rejects.toThrow();
    await expect(withTenantContext(partA, (tx) => tx.tenderDebrief.create({ data: { organizationId: issuer, tenderId: openId, bidId: randomUUID(), bidderOrganizationId: partA, outcome: "AWARDED", scoresJson: "[]", lotsJson: lotsA } }))).rejects.toThrow();
    expect(dB.id).not.toBe(dA.id);
  });
  it("call-offs, their lines and price reviews are shared by the owner and the awarded supplier only; approval settings are private to the owner", async () => {
    const sfx = randomUUID().slice(0, 8);
    const c = await withTenantContext(issuer, (tx) => tx.tenderContract.create({ data: { organizationId: issuer, awardedOrganizationId: partA, tenderId: openId, awardId: randomUUID(), reference: `CON-F-${sfx}`, title: "Framework", status: "ACTIVE" } }));
    const co = await withTenantContext(issuer, (tx) => tx.tenderCallOff.create({ data: { organizationId: issuer, awardedOrganizationId: partA, tenderId: openId, contractId: c.id, reference: `CO-${sfx}`, method: "DIRECT", totalValue: 10, testedValue: 10, raisedById: randomUUID() } }));
    await withTenantContext(issuer, (tx) => tx.tenderCallOffLine.create({ data: { organizationId: issuer, awardedOrganizationId: partA, tenderId: openId, callOffId: co.id, tenderLineId: randomUUID(), quantity: 1, unitPrice: 10, lineTotal: 10 } }));
    await withTenantContext(partA, (tx) => tx.tenderPriceReview.create({ data: { organizationId: issuer, awardedOrganizationId: partA, tenderId: openId, contractId: c.id, tenderLineId: randomUUID(), previousPrice: 1, proposedPrice: 2, reason: "Costs", proposedByOrganizationId: partA } }));
    for (const org of [issuer, partA]) {
      expect(await withTenantContext(org, (tx) => tx.tenderCallOff.count({ where: { id: co.id } }))).toBe(1);
      expect(await withTenantContext(org, (tx) => tx.tenderCallOffLine.count({ where: { callOffId: co.id } }))).toBe(1);
      expect(await withTenantContext(org, (tx) => tx.tenderPriceReview.count({ where: { contractId: c.id } }))).toBe(1);
    }
    for (const org of [partB, outsider]) {
      expect(await withTenantContext(org, (tx) => tx.tenderCallOff.count({ where: { id: co.id } }))).toBe(0);
      expect(await withTenantContext(org, (tx) => tx.tenderCallOffLine.count({ where: { callOffId: co.id } }))).toBe(0);
      expect(await withTenantContext(org, (tx) => tx.tenderPriceReview.count({ where: { contractId: c.id } }))).toBe(0);
    }
    await expect(withTenantContext(partB, (tx) => tx.tenderCallOff.create({ data: { organizationId: issuer, awardedOrganizationId: partA, tenderId: openId, contractId: c.id, reference: `X-${sfx}`, method: "DIRECT", totalValue: 1, testedValue: 1, raisedById: randomUUID() } }))).rejects.toThrow();
    await withTenantContext(issuer, (tx) => tx.tenderApprovalSettings.create({ data: { organizationId: issuer, individualLimit: 5000 } }));
    expect(await withTenantContext(issuer, (tx) => tx.tenderApprovalSettings.count({ where: { organizationId: issuer } }))).toBe(1);
    expect(await withTenantContext(partA, (tx) => tx.tenderApprovalSettings.count({ where: { organizationId: issuer } }))).toBe(0);
  });
  it("mini-competitions are private to the owner; each quote and its lines are shared by the owner and that one supplier, so rival suppliers never see each other", async () => {
    const mc = await withTenantContext(issuer, (tx) => tx.tenderMiniCompetition.create({ data: { organizationId: issuer, tenderId: openId, reference: `MC-${randomUUID().slice(0, 6)}`, closesAt: new Date(Date.now() + 86_400_000), linesJson: "[]", createdById: randomUUID() } }));
    const quote = (supplier: string) => withTenantContext(issuer, (tx) => tx.tenderCallOffQuote.create({ data: { organizationId: issuer, awardedOrganizationId: supplier, tenderId: openId, competitionId: mc.id, contractId: randomUUID(), reference: "MC", closesAt: new Date(Date.now() + 86_400_000) } }));
    const qA = await quote(partA); const qB = await quote(partB);
    await withTenantContext(issuer, (tx) => tx.tenderCallOffQuoteLine.create({ data: { organizationId: issuer, awardedOrganizationId: partA, tenderId: openId, quoteId: qA.id, tenderLineId: randomUUID(), quantity: 1, frameworkPrice: 10 } }));
    expect(await withTenantContext(issuer, (tx) => tx.tenderMiniCompetition.count({ where: { id: mc.id } }))).toBe(1);
    for (const org of [partA, partB, outsider]) expect(await withTenantContext(org, (tx) => tx.tenderMiniCompetition.count({ where: { id: mc.id } }))).toBe(0);
    expect(await withTenantContext(partA, (tx) => tx.tenderCallOffQuote.count({ where: { id: { in: [qA.id, qB.id] } } }))).toBe(1);
    expect(await withTenantContext(partB, (tx) => tx.tenderCallOffQuote.count({ where: { id: { in: [qA.id, qB.id] } } }))).toBe(1);
    expect(await withTenantContext(issuer, (tx) => tx.tenderCallOffQuote.count({ where: { id: { in: [qA.id, qB.id] } } }))).toBe(2);
    expect(await withTenantContext(partB, (tx) => tx.tenderCallOffQuoteLine.count({ where: { quoteId: qA.id } }))).toBe(0);
    expect(await withTenantContext(partA, (tx) => tx.tenderCallOffQuoteLine.count({ where: { quoteId: qA.id } }))).toBe(1);
    expect(await withTenantContext(outsider, (tx) => tx.tenderCallOffQuote.count({ where: { id: { in: [qA.id, qB.id] } } }))).toBe(0);
    await expect(withTenantContext(partB, (tx) => tx.tenderCallOffQuote.update({ where: { id: qA.id }, data: { status: "QUOTED" } }))).rejects.toThrow();
  });
});
