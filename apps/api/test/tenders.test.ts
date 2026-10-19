import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { chipsFor, evaluateEligibility, matchesSavedSearch, type OrgProfile } from "../src/tenders/eligibility";
import { TendersService } from "../src/tenders/tenders.service";

const profile = (over: Partial<OrgProfile> = {}): OrgProfile => ({ organizationId: "org-1", orgType: "MANUFACTURER", countries: ["KE", "GB"], categories: ["Pharmaceuticals.Antimalarials"], qualifications: ["WHO_PQ"], hasProfileEvidence: true, ...over });
const rule = (id: string, ruleType: string, ruleValue: string, isRequired = true, explanation: string | null = null) => ({ id, ruleType, ruleValue, isRequired, explanation });

describe("Tender eligibility logic", () => {
  it("meets every rule: eligible, can bid, no actions", () => {
    const r = evaluateEligibility([rule("1", "ORG_TYPE", "MANUFACTURER,SUPPLIER"), rule("2", "COUNTRY", "KE"), rule("3", "CATEGORY", "Pharmaceuticals"), rule("4", "QUALIFICATION", "WHO_PQ")], profile());
    expect(r.outcome).toBe("ELIGIBLE");
    expect(r.canBid).toBe(true);
    expect(r.items.every((i) => i.status === "MET" && i.action === null)).toBe(true);
  });

  it("missing country is fixable: almost eligible, with a plain action", () => {
    const r = evaluateEligibility([rule("1", "COUNTRY", "UG")], profile());
    expect(r.outcome).toBe("ALMOST_ELIGIBLE");
    expect(r.canBid).toBe(false);
    expect(r.items[0].action).toMatch(/countries of operation/);
  });

  it("wrong organisation type can never be fixed: not eligible", () => {
    const r = evaluateEligibility([rule("1", "ORG_TYPE", "TENDERING_PURCHASING_BODY")], profile());
    expect(r.outcome).toBe("NOT_ELIGIBLE");
  });

  it("more than two failures reads as not eligible", () => {
    const r = evaluateEligibility([rule("1", "COUNTRY", "UG"), rule("2", "CATEGORY", "Vaccines"), rule("3", "QUALIFICATION", "ISO_13485")], profile());
    expect(r.unmetRequired).toBe(3);
    expect(r.outcome).toBe("NOT_ELIGIBLE");
  });

  it("a missing qualification needs evidence when there is no profile, otherwise is not met; optional rules never block", () => {
    expect(evaluateEligibility([rule("1", "QUALIFICATION", "ISO_13485")], profile({ qualifications: [], hasProfileEvidence: false })).items[0].status).toBe("NEEDS_EVIDENCE");
    expect(evaluateEligibility([rule("1", "QUALIFICATION", "ISO_13485")], profile()).items[0].status).toBe("NOT_MET");
    expect(evaluateEligibility([rule("1", "QUALIFICATION", "ISO_13485", false)], profile()).outcome).toBe("ELIGIBLE");
  });

  it("an invitation lets an organisation bid, but an exclusion overrides it", () => {
    const rules = [rule("1", "COUNTRY", "UG")];
    expect(evaluateEligibility(rules, profile(), { invited: true }).canBid).toBe(true);
    const excluded = evaluateEligibility([...rules, rule("2", "EXCLUDED_ORG", "org-1")], profile(), { invited: true });
    expect(excluded.canBid).toBe(false);
    expect(excluded.outcome).toBe("NOT_ELIGIBLE");
  });

  it("category rules match by hierarchy, and a custom explanation replaces the default action", () => {
    expect(evaluateEligibility([rule("1", "CATEGORY", "Pharmaceuticals.Antimalarials")], profile()).outcome).toBe("ELIGIBLE");
    expect(evaluateEligibility([rule("1", "CATEGORY", "Pharmaceuticals.Antimalarials")], profile({ categories: ["Pharmaceuticals"] })).outcome).toBe("ELIGIBLE");
    const r = evaluateEligibility([rule("1", "COUNTRY", "UG", true, "Open a Ugandan entity first.")], profile());
    expect(r.items[0].action).toBe("Open a Ugandan entity first.");
  });

  it("chips combine eligibility with invited, participating, shortlisted and closing soon", () => {
    const now = new Date("2026-10-19T12:00:00Z");
    const result = evaluateEligibility([], profile(), { invited: true });
    expect(chipsFor({ result, participating: true, shortlisted: true, closingAt: new Date("2026-10-23T00:00:00Z"), status: "PUBLISHED", now })).toEqual(["ELIGIBLE", "INVITED", "PARTICIPATING", "SHORTLISTED", "CLOSING_SOON"]);
    expect(chipsFor({ result, participating: false, shortlisted: false, closingAt: new Date("2026-10-01T00:00:00Z"), status: "PUBLISHED", now })).toContain("CLOSED");
  });

  it("saved searches match on type, country, category and keyword", () => {
    const t = { title: "Artemether tablets framework", summary: null, tenderType: "RFQ", deliveryCountryCodes: ",KE,UG,", categories: ["Pharmaceuticals.Antimalarials"] };
    expect(matchesSavedSearch({ countries: ["KE"], categories: ["Pharmaceuticals"], keyword: "artemether" }, t)).toBe(true);
    expect(matchesSavedSearch({ countries: ["TZ"] }, t)).toBe(false);
    expect(matchesSavedSearch({ types: ["RFP"] }, t)).toBe(false);
    expect(matchesSavedSearch({}, t)).toBe(true);
  });
});

/** Tender issuing and participation through the service against a real RLS database (2026-10-19). */
describe("Tender service", () => {
  const suffix = randomUUID().slice(0, 8);
  const svc = new TendersService();
  let issuer: string; let capable: string; let incapable: string; let invitee: string;
  let inviteeUser: string; let issuerUser: string; let capableUser: string; let incapableUser: string;

  const asUser = (organizationId: string, permissions: string[]): RequestUser => ({
    id: ({ [issuer]: issuerUser, [capable]: capableUser, [incapable]: incapableUser, [invitee]: inviteeUser } as Record<string, string>)[organizationId], organizationId, homeOrganizationId: organizationId, email: `t-${organizationId.slice(0, 6)}@example.com`, forename: "Tender", surname: "Tester",
    organizationName: "Org", organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null,
    platformStaffRole: "NONE", permissions,
  });
  const ISSUE = ["tenders.view", "tenders.issue"]; const BID = ["tenders.view", "tenders.bid"];
  const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

  beforeAll(async () => {
    issuer = (await createOrganizationWithDefaultRoles({ name: `T Issuer ${suffix}`, slug: `t-iss-${suffix}`, type: "TENDERING_PURCHASING_BODY" })).id;
    capable = (await createOrganizationWithDefaultRoles({ name: `T Capable ${suffix}`, slug: `t-cap-${suffix}`, type: "MANUFACTURER" })).id;
    incapable = (await createOrganizationWithDefaultRoles({ name: `T Incapable ${suffix}`, slug: `t-inc-${suffix}`, type: "SUPPLIER" })).id;
    invitee = (await createOrganizationWithDefaultRoles({ name: `T Invitee ${suffix}`, slug: `t-inv-${suffix}`, type: "SUPPLIER" })).id;
    await withPlatformStaffContext(async (tx) => {
      await tx.country.upsert({ where: { code: "KE" }, update: {}, create: { code: "KE", name: "Kenya", regionCode: "AF" } }).catch(() => undefined);
      const mk = async (organizationId: string, tag: string) => (await tx.user.create({ data: { organizationId, email: `${tag}-${suffix}@example.com`, forename: tag, surname: "T", status: "ACTIVE", entraObjectId: `oid-${tag}-${suffix}` } })).id;
      issuerUser = await mk(issuer, "iss"); capableUser = await mk(capable, "cap"); incapableUser = await mk(incapable, "inc");
      inviteeUser = (await tx.user.create({ data: { organizationId: invitee, email: `inv-${suffix}@example.com`, forename: "In", surname: "Vitee", status: "ACTIVE", entraObjectId: `oid-inv-${suffix}` } })).id;
      const perm = await tx.permission.upsert({ where: { key: "tenders.view" }, update: {}, create: { key: "tenders.view", description: "Browse tenders" } });
      const role = await tx.role.create({ data: { organizationId: invitee, name: `Tender viewer ${suffix}`, appScope: "*" } });
      await tx.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
      await tx.userRole.create({ data: { userId: inviteeUser, roleId: role.id } });
      await tx.manufacturerProfile.create({ data: { organizationId: capable, whoPrequalified: true } });
    });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  const build = async (over: Record<string, unknown> = {}, rules: { ruleType: string; ruleValue: string; explanation?: string }[] = [], publish = true) => {
    const u = asUser(issuer, ISSUE);
    const t = await svc.create(u, { title: `Antimalarials ${suffix}`, closingAt: future(30), tenderType: "RFQ", ...over } as never);
    await svc.setLines(u, t.id, { lines: [{ description: "Artemether/lumefantrine 20/120 mg", quantity: 1000, unit: "pack", destinationCountryCode: "KE" }] });
    await svc.setCriteria(u, t.id, { criteria: [{ title: "Price", kind: "SCORED", weight: 60 }, { title: "Quality", kind: "SCORED", weight: 40 }, { title: "Registered", kind: "GATE" }] });
    await svc.setRules(u, t.id, { rules });
    if (publish) await svc.publish(u, t.id);
    return t;
  };

  it("refuses to publish an incomplete tender and lists what is missing", async () => {
    const u = asUser(issuer, ISSUE);
    const t = await svc.create(u, { title: `Empty ${suffix}` } as never);
    await expect(svc.publish(u, t.id)).rejects.toMatchObject({ response: { problems: expect.arrayContaining(["Add at least one line item.", "Set a closing date."]) } });
  });

  it("requires weights to total 100", async () => {
    const u = asUser(issuer, ISSUE);
    const t = await svc.create(u, { title: `Weights ${suffix}`, closingAt: future(10) } as never);
    await svc.setLines(u, t.id, { lines: [{ description: "x" }] });
    await svc.setCriteria(u, t.id, { criteria: [{ title: "Price", kind: "SCORED", weight: 70 }] });
    await expect(svc.publish(u, t.id)).rejects.toMatchObject({ response: { problems: expect.arrayContaining([expect.stringContaining("total 100")]) } });
  });

  it("needs the issue permission", async () => {
    await expect(svc.create(asUser(issuer, BID), { title: "x" } as never)).rejects.toThrow(/Missing permission/);
  });

  it("a draft is invisible to participants; once published every organisation sees it with a chip", async () => {
    const draft = await build({ title: `Hidden draft ${suffix}` }, [], false);
    const open = await build({ title: `Open ${suffix}` }, [{ ruleType: "QUALIFICATION", ruleValue: "WHO_PQ" }]);
    const capableView = await svc.listAvailable(asUser(capable, BID), { keyword: suffix });
    expect(capableView.tenders.map((t) => t.id)).toContain(open.id);
    expect(capableView.tenders.map((t) => t.id)).not.toContain(draft.id);
    expect(capableView.tenders.find((t) => t.id === open.id)!.chips).toContain("ELIGIBLE");
    const incapableView = await svc.listAvailable(asUser(incapable, BID), { keyword: suffix });
    const row = incapableView.tenders.find((t) => t.id === open.id)!;
    expect(row.chips).toContain("ALMOST_ELIGIBLE");
    expect(row.canBid).toBe(false);
    const detail = await svc.getForParticipant(asUser(incapable, BID), open.id);
    expect(detail.eligibility.items[0].status).toBe("NEEDS_EVIDENCE"); // this supplier has no profile on record yet
    expect(detail.eligibility.items[0].action).toMatch(/profile/);
    await expect(svc.getForParticipant(asUser(incapable, BID), draft.id)).rejects.toThrow(/not found/i);
  });

  it("only an eligible organisation can express interest; the issuer sees it; withdrawing works", async () => {
    const t = await build({ title: `Interest ${suffix}` }, [{ ruleType: "QUALIFICATION", ruleValue: "WHO_PQ" }]);
    await expect(svc.expressInterest(asUser(incapable, BID), t.id)).rejects.toMatchObject({ response: { checklist: expect.any(Array) } });
    await svc.expressInterest(asUser(capable, BID), t.id);
    await svc.expressInterest(asUser(capable, BID), t.id); // idempotent
    const mine = await svc.getMine(asUser(issuer, ISSUE), t.id);
    expect(mine.participants.map((p) => p.organizationId)).toEqual([capable]);
    const check = await withTenantContext(capable, (tx) => tx.tenderEligibilityCheck.count({ where: { tenderId: t.id } }));
    expect(check).toBe(1);
    await svc.withdrawInterest(asUser(capable, BID), t.id);
    expect((await svc.getMine(asUser(issuer, ISSUE), t.id)).participants).toHaveLength(0);
  });

  it("locks content after publication, and only lets the closing date move later", async () => {
    const t = await build({ title: `Locked ${suffix}` });
    const u = asUser(issuer, ISSUE);
    await expect(svc.setLines(u, t.id, { lines: [{ description: "new" }] })).rejects.toThrow(/locked/);
    await expect(svc.update(u, t.id, { title: "renamed" })).rejects.toThrow(/dates extended/);
    await expect(svc.update(u, t.id, { closingAt: future(5) })).rejects.toThrow(/later/);
    const moved = await svc.update(u, t.id, { closingAt: future(40) });
    expect(moved.closingAt!.getTime()).toBeGreaterThan(Date.now() + 35 * 86_400_000);
  });

  it("an invited-only tender is visible only to the invited, who can bid regardless of rules, and are notified", async () => {
    const u = asUser(issuer, ISSUE);
    const t = await build({ title: `Invite ${suffix}`, visibility: "INVITED_ONLY" }, [{ ruleType: "COUNTRY", ruleValue: "ZZ" }], false);
    await svc.invite(u, t.id, { organizationIds: [invitee] });
    await svc.publish(u, t.id);
    expect((await svc.listAvailable(asUser(capable, BID), { keyword: suffix })).tenders.map((x) => x.id)).not.toContain(t.id);
    const row = (await svc.listAvailable(asUser(invitee, BID), { keyword: suffix })).tenders.find((x) => x.id === t.id)!;
    expect(row.chips).toEqual(expect.arrayContaining(["INVITED"]));
    expect(row.canBid).toBe(true);
    const notes = await withTenantContext(invitee, (tx) => tx.notification.count({ where: { recipientUserId: inviteeUser, kind: "TENDER_INVITED", subjectId: t.id } }));
    expect(notes).toBe(1);
  });

  it("shortlist and saved searches are private to the organisation; for-you lists eligible open tenders", async () => {
    const t = await build({ title: `Shortlist ${suffix}` });
    await svc.addShortlist(asUser(capable, BID), t.id, "look at this");
    expect((await svc.listAvailable(asUser(capable, BID), { shortlistedOnly: true })).tenders.map((x) => x.id)).toContain(t.id);
    expect((await svc.listAvailable(asUser(incapable, BID), { shortlistedOnly: true })).tenders.map((x) => x.id)).not.toContain(t.id);
    await svc.saveSearch(asUser(capable, BID), { name: "Antimalarials", keyword: "Shortlist" });
    expect(await svc.listSavedSearches(asUser(incapable, BID))).toHaveLength(0);
    expect((await svc.forYou(asUser(capable, BID))).tenders.map((x) => x.id)).toContain(t.id);
  });

  it("organisation search for invitations finds registered organisations, never the issuer, and needs the issue permission", async () => {
    const hits = await svc.searchOrganisations(asUser(issuer, ISSUE), `T Capable ${suffix}`);
    expect(hits.map((h) => h.id)).toEqual([capable]);
    expect((await svc.searchOrganisations(asUser(issuer, ISSUE), `T Issuer ${suffix}`)).map((h) => h.id)).not.toContain(issuer);
    expect(await svc.searchOrganisations(asUser(issuer, ISSUE), "a")).toEqual([]);
    await expect(svc.searchOrganisations(asUser(capable, BID), "T Capable")).rejects.toThrow(/Missing permission/);
  });

  it("the issuer dashboard counts by status and flags tenders closing soon", async () => {
    await build({ title: `Soon ${suffix}`, closingAt: future(3) });
    const d = await svc.dashboard(asUser(issuer, ISSUE));
    expect(d.totals.open).toBeGreaterThan(0);
    expect(d.totals.draft).toBeGreaterThan(0);
    expect(d.closingSoon.some((t) => t.title.startsWith("Soon"))).toBe(true);
  });
});
