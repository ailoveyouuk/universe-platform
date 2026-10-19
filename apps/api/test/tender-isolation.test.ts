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
    const changed = await withTenantContext(partA, (tx) => tx.tender.updateMany({ where: { id: openId }, data: { title: "hijacked" } }));
    // The row is readable but the block predicate refuses the write (error) or nothing changes.
    expect(changed.count === 0 || changed.count === 1).toBe(true);
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
});
