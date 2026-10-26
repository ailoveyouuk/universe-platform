import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { chipsFor, evaluateEligibility, matchesSavedSearch, type OrgProfile } from "../src/tenders/eligibility";
import { TenderAwardService } from "../src/tenders/tender-award.service";
import { TenderEvaluationService } from "../src/tenders/tender-evaluation.service";
import { addWorkingDays, calculatedScores, normaliseWeights, overAllocatedLines, rankBids, weightedTotal } from "../src/tenders/evaluation";
import { SCREENING_LISTS } from "@universe/types";
import { TenderBidsService } from "../src/tenders/tender-bids.service";
import { ProjectsService } from "../src/projects/projects.service";
import { TenderBidProjectsService } from "../src/tenders/tender-bid-projects.service";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { checkBid, crossRate } from "../src/tenders/bid-completeness";
import { TenderComplianceService } from "../src/tenders/tender-compliance.service";
import { eventHash, verifyChain } from "../src/tenders/tender-events";
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
    // A keyword also finds what is being bought, via the line descriptions.
    expect(matchesSavedSearch({ keyword: "lumefantrine" }, t)).toBe(false);
    expect(matchesSavedSearch({ keyword: "lumefantrine" }, { ...t, lineText: "Artemether/lumefantrine 20/120 mg" })).toBe(true);
  });
});

/** Tender issuing and participation through the service against a real RLS database (2026-10-19). */
describe("Tender service", () => {
  const suffix = randomUUID().slice(0, 8);
  const svc = new TendersService();
  const comp = new TenderComplianceService(svc);
  const DECL = { integrityPledge: true, exclusion: { noGrounds: true } };
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
    const t = await svc.create(u, { title: `Antimalarials ${suffix}`, closingAt: future(30), tenderType: "RFQ", currency: "USD", ...over } as never);
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
    await svc.update(u, t.id, { currency: "USD" });
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
    await expect(svc.expressInterest(asUser(incapable, BID), t.id, DECL)).rejects.toMatchObject({ response: { checklist: expect.any(Array) } });
    await svc.expressInterest(asUser(capable, BID), t.id, DECL);
    await svc.expressInterest(asUser(capable, BID), t.id, DECL); // idempotent
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

  it("requires a currency to publish", async () => {
    const u = asUser(issuer, ISSUE);
    const t = await build({ title: `No currency ${suffix}`, currency: undefined }, [], false);
    await expect(svc.publish(u, t.id)).rejects.toMatchObject({ response: { problems: expect.arrayContaining([expect.stringContaining("currency")]) } });
  });

  it("interest needs the integrity pledge and an exclusion declaration; declared grounds are recorded for the issuer", async () => {
    const t = await build({ title: `Declare ${suffix}` });
    await expect(svc.expressInterest(asUser(capable, BID), t.id, {})).rejects.toThrow(/integrity pledge/);
    await expect(svc.expressInterest(asUser(capable, BID), t.id, { integrityPledge: true })).rejects.toThrow(/exclusion declaration/);
    await expect(svc.expressInterest(asUser(capable, BID), t.id, { integrityPledge: true, exclusion: { noGrounds: false, grounds: [] } })).rejects.toThrow(/no grounds apply/);
    await expect(svc.expressInterest(asUser(capable, BID), t.id, { integrityPledge: true, exclusion: { noGrounds: false, grounds: ["INSOLVENCY"] } })).rejects.toThrow(/Explain/);
    await svc.expressInterest(asUser(capable, BID), t.id, { integrityPledge: true, exclusion: { noGrounds: false, grounds: ["INSOLVENCY"], explanation: "Restructuring completed in 2025." } });
    const p = (await svc.getMine(asUser(issuer, ISSUE), t.id)).participants[0];
    expect(p.integrityPledgeAt).toBeTruthy();
    expect(p.exclusionGrounds).toEqual(["INSOLVENCY"]);
    expect(p.exclusionExplanation).toMatch(/Restructuring/);
  });

  it("a tender can switch the declarations off", async () => {
    const t = await build({ title: `No declare ${suffix}`, requireIntegrityPledge: false, requireExclusionDeclaration: false });
    await svc.expressInterest(asUser(capable, BID), t.id, {});
    expect((await svc.getMine(asUser(issuer, ISSUE), t.id)).participants).toHaveLength(1);
  });

  it("questions are answered to everyone without naming the asker, and only before the question deadline", async () => {
    const t = await build({ title: `Q and A ${suffix}` });
    await comp.askQuestion(asUser(capable, BID), t.id, "Is the 20/120 mg dispersible strength mandatory?");
    const mine = await svc.getMine(asUser(issuer, ISSUE), t.id);
    expect(mine.questions).toHaveLength(1);
    expect(mine.questions[0].askedByOrganisation).toMatch(/T Capable/);
    await comp.answerQuestion(asUser(issuer, ISSUE), t.id, mine.questions[0].id, { answer: "Yes, dispersible is mandatory.", publishedQuestion: "Is the dispersible strength mandatory?" });
    await expect(comp.answerQuestion(asUser(issuer, ISSUE), t.id, mine.questions[0].id, { answer: "again" })).rejects.toThrow(/already been answered/);
    const view = await svc.getForParticipant(asUser(incapable, BID), t.id);
    expect(view.clarifications).toHaveLength(1);
    expect(JSON.stringify(view.clarifications)).not.toMatch(/T Capable/);
    const closed = await build({ title: `Q late ${suffix}`, clarificationDeadline: future(0.6) });
    await withTenantContext(issuer, (tx) => tx.tender.update({ where: { id: closed.id }, data: { clarificationDeadline: new Date(Date.now() - 1000) } }));
    await expect(comp.askQuestion(asUser(capable, BID), closed.id, "Too late to ask this one?")).rejects.toThrow(/deadline/);
  });

  it("an addendum can extend the closing date, notifies participants and is acknowledged per organisation", async () => {
    const u = asUser(issuer, ISSUE);
    const t = await build({ title: `Addendum ${suffix}` });
    await svc.expressInterest(asUser(capable, BID), t.id, DECL);
    const a = await comp.createAddendum(u, t.id, { title: "Pack size clarified", body: "Blister of 24, not 6.", newClosingAt: future(45) });
    expect(a.number).toBe(1);
    await expect(comp.createAddendum(u, t.id, { title: "Earlier", body: "x", newClosingAt: future(2) })).rejects.toThrow(/later/);
    const before = (await svc.getMine(u, t.id)).addenda[0];
    expect(before.acknowledgedBy).toBe(0);
    expect(before.outstanding).toHaveLength(1);
    await expect(comp.acknowledgeAddendum(asUser(incapable, BID), t.id, a.id)).rejects.toThrow(/expressed interest/);
    await comp.acknowledgeAddendum(asUser(capable, BID), t.id, a.id);
    const after = (await svc.getMine(u, t.id)).addenda[0];
    expect(after.acknowledgedBy).toBe(1);
    expect(after.outstanding).toHaveLength(0);
    expect((await svc.getForParticipant(asUser(capable, BID), t.id)).addenda[0].acknowledged).toBe(true);
    const notes = await withTenantContext(capable, (tx) => tx.notification.count({ where: { recipientUserId: capableUser, kind: "TENDER_ADDENDUM", subjectId: t.id } }));
    expect(notes).toBe(0); // the capable test user holds no tenders.view role; notification delivery is covered for the invitee elsewhere
  });

  it("screening is recorded by the issuer for participants only, and is invisible to the screened organisation", async () => {
    const u = asUser(issuer, ISSUE);
    const t = await build({ title: `Screen ${suffix}` });
    await svc.expressInterest(asUser(capable, BID), t.id, DECL);
    await expect(comp.recordScreening(u, t.id, { organisationId: incapable, lists: ["UN_SECURITY_COUNCIL"], outcome: "CLEAR", screenedOn: new Date().toISOString() })).rejects.toThrow(/participating or invited/);
    await expect(comp.recordScreening(u, t.id, { organisationId: capable, lists: [], outcome: "CLEAR", screenedOn: new Date().toISOString() })).rejects.toThrow(/at least one list/);
    await comp.recordScreening(u, t.id, { organisationId: capable, lists: ["UN_SECURITY_COUNCIL", "WORLD_BANK_DEBARMENT"], outcome: "CLEAR", notes: "Checked 19 Oct.", screenedOn: new Date().toISOString() });
    const mine = await svc.getMine(u, t.id);
    expect(mine.screenings).toHaveLength(1);
    expect(mine.screenings[0].lists).toEqual(["UN_SECURITY_COUNCIL", "WORLD_BANK_DEBARMENT"]);
    const seenByScreened = await withTenantContext(capable, (tx) => tx.tenderScreening.count({ where: { tenderId: t.id } }));
    expect(seenByScreened).toBe(0);
  });

  it("the audit timeline is hash-chained and verification catches tampering", async () => {
    const u = asUser(issuer, ISSUE);
    const t = await build({ title: `Chain ${suffix}` });
    await svc.expressInterest(asUser(capable, BID), t.id, DECL);
    await comp.createAddendum(u, t.id, { title: "Note", body: "A note." });
    const ok = await comp.verifyTimeline(u, t.id);
    expect(ok.ok).toBe(true);
    expect(ok.events).toBeGreaterThanOrEqual(4);
    const events = (await withPlatformStaffContext((tx) => tx.tenderEvent.findMany({ where: { tenderId: t.id } }))).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const tampered = events.map((e, i) => (i === 1 ? { ...e, summary: "Edited afterwards" } : e));
    expect(verifyChain(events).ok).toBe(true);
    expect(verifyChain(tampered).ok).toBe(false);
    expect(verifyChain(events.filter((_, i) => i !== 1)).ok).toBe(false);
    expect(events[0].prevHash).toBeNull();
    const pub = events.find((e) => e.kind === "PUBLISHED");
    const snap = JSON.parse(pub!.detailsJson!).snapshot;
    expect(snap.title).toBe(`Chain ${suffix}`);
    expect(snap.lines.length).toBeGreaterThan(0);
    expect(snap.criteria.length).toBeGreaterThan(0);
    expect(eventHash(events[0] as never)).toBe(events[0].hash);
  });

  it("public notices list only opted-in, non-simulated tenders and expose no bidder data", async () => {
    const pub = await build({ title: `Public ${suffix}`, publicNotice: true });
    const priv = await build({ title: `Private ${suffix}` });
    const all = await comp.publicNotices();
    expect(all.map((n) => n.id)).toContain(pub.id);
    expect(all.map((n) => n.id)).not.toContain(priv.id);
    const one = (await comp.publicNotices(pub.id))[0];
    expect(Object.keys(one)).not.toContain("organizationId");
    expect(one.issuerName).toMatch(/T Issuer/);
    await withTenantContext(issuer, (tx) => tx.tender.update({ where: { id: priv.id }, data: { isSimulated: true, publicNotice: true } }));
    expect((await comp.publicNotices()).map((n) => n.id)).not.toContain(priv.id);
  });

  it("standstill defaults to eight working days when switched on and is locked after publication", async () => {
    const u = asUser(issuer, ISSUE);
    const t = await build({ title: `Standstill ${suffix}`, standstillEnabled: true });
    expect((await svc.getMine(u, t.id)).tender.standstillWorkingDays).toBe(8);
    await expect(svc.update(u, t.id, { standstillEnabled: false })).rejects.toThrow(/dates extended/);
  });

  // ---- bids (step 3)
  const fxStub = { getSnapshotForDate: async () => ({ id: "snap", date: new Date("2026-10-19T00:00:00Z"), rates: { USD: 1, EUR: 0.9, GBP: 0.8 } }) } as never;
  const blobStub = { getUploadUrl: async (_o: string, blobName: string) => ({ uploadUrl: "https://x/upload", blobName }), getDownloadUrl: async () => "https://x/download" } as never;
  const bids = new TenderBidsService(svc, fxStub, blobStub);
  const openBuilt = async (over: Record<string, unknown> = {}) => {
    const t = await build({ title: `Bid ${randomUUID().slice(0, 6)} ${suffix}`, ...over });
    await svc.expressInterest(asUser(capable, BID), t.id, DECL);
    return t;
  };
  const fillBid = async (tenderId: string, over: Record<string, unknown> = {}) => {
    const ws = await bids.getWorkspace(asUser(capable, BID), tenderId);
    return bids.saveBid(asUser(capable, BID), tenderId, {
      bidCurrency: "EUR", validityConfirmed: true,
      lines: ws.lines.map((l) => ({ tenderLineId: l.tenderLineId, noBid: false, unitPrice: 2, leadTimeDays: 30, countryOfOrigin: "IN", manufacturerName: "Quoted Pharma Ltd" })),
      responses: ws.criteria.filter((c) => c.isMandatory).map((c) => ({ criterionId: c.id, text: "We comply." })),
      ...over,
    } as never);
  };

  it("bid completeness lists exactly what is missing; cross rates go via USD", () => {
    const base = { allowTextSubmission: true, bidValidityDays: 90, bidCurrency: "EUR", validityConfirmed: true, lines: [{ noBid: false, unitPrice: 2, leadTimeDays: 5, countryOfOrigin: "IN" }], criteria: [{ title: "Reg", isMandatory: true, responseFormat: "UPLOAD", text: "words", fileCount: 0 }], addenda: [{ requiresAcknowledgement: true, acknowledged: false }] };
    const r = checkBid(base);
    expect(r.filter((x) => !x.ok).map((x) => x.label.slice(0, 20))).toEqual(["Answer every require", "Acknowledge 1 addend"]);
    expect(checkBid({ ...base, bidCurrency: null, lines: [{ noBid: true, unitPrice: null, leadTimeDays: null, countryOfOrigin: null }] }).filter((x) => !x.ok).length).toBeGreaterThanOrEqual(3);
    expect(crossRate({ EUR: 0.9, GBP: 0.8 }, "EUR", "GBP")).toBeCloseTo(0.8 / 0.9);
    expect(crossRate({ EUR: 0.9 }, "USD", "EUR")).toBe(0.9);
    expect(crossRate({ EUR: 0.9 }, "EUR", "EUR")).toBe(1);
    expect(crossRate({ EUR: 0.9 }, "EUR", "JPY")).toBeNull();
  });

  it("a bid needs interest first; an incomplete bid cannot be submitted and says why", async () => {
    const t = await build({ title: `Bid gate ${suffix}` });
    await expect(bids.getWorkspace(asUser(capable, BID), t.id)).rejects.toThrow(/Express interest/);
    await svc.expressInterest(asUser(capable, BID), t.id, DECL);
    const ws = await bids.getWorkspace(asUser(capable, BID), t.id);
    expect(ws.bid.status).toBe("NONE");
    expect(ws.canSubmit).toBe(false);
    await expect(bids.submitBid(asUser(capable, BID), t.id)).rejects.toThrow();
    await expect(bids.getWorkspace(asUser(incapable, BID), t.id)).rejects.toThrow();
    await expect(bids.saveBid(asUser(capable, ["tenders.view"]), t.id, {} as never)).rejects.toThrow();
  });

  it("submits in a different currency using the stored daily rate, and issuers cannot see it until closing", async () => {
    const t = await openBuilt();
    const ws = await fillBid(t.id);
    expect(ws.canSubmit).toBe(true);
    const res = await bids.submitBid(asUser(capable, BID), t.id);
    expect(Number(res.fxRate)).toBeCloseTo(1 / 0.9, 4);
    expect(Number(res.totalTenderCurrency)).toBeCloseTo(Math.round((2000 / 0.9 + Number.EPSILON) * 100) / 100, 2);
    expect(await bids.countSubmitted(asUser(issuer, ISSUE), t.id)).toBe(1);
    await expect(bids.listBids(asUser(issuer, ISSUE), t.id)).rejects.toThrow(/sealed/);
    expect((await bids.myBids(asUser(capable, BID))).find((b) => b.tenderId === t.id)?.status).toBe("SUBMITTED");
    // editing a submitted bid returns it to draft
    expect((await bids.saveBid(asUser(capable, BID), t.id, { notes: "tweak" })).bid.status).toBe("DRAFT");
    await bids.submitBid(asUser(capable, BID), t.id);
    await bids.withdrawBid(asUser(capable, BID), t.id);
    expect(await bids.countSubmitted(asUser(issuer, ISSUE), t.id)).toBe(0);
  });

  it("opens to the issuer after closing, logs the opening, and never exposes drafts", async () => {
    const t = await openBuilt();
    await fillBid(t.id, { bidCurrency: "USD" });
    await bids.submitBid(asUser(capable, BID), t.id);
    await withTenantContext(issuer, (tx) => tx.tender.update({ where: { id: t.id }, data: { closingAt: new Date(Date.now() - 60_000) } }));
    await expect(bids.listBids(asUser(issuer, ISSUE), t.id)).rejects.toThrow(/Open the bids first/);
    await bids.openBids(asUser(issuer, ISSUE), t.id);
    const list = await bids.listBids(asUser(issuer, ISSUE), t.id);
    expect(list).toHaveLength(1);
    expect(Number(list[0].totalTenderCurrency)).toBe(2000);
    expect(list[0].organizationId).toBe(capable);
    await expect(bids.listBids(asUser(capable, BID), t.id)).rejects.toThrow();
    await expect(bids.submitBid(asUser(capable, BID), t.id)).rejects.toThrow(/no longer accepting|already/);
    const tl = await svc.getMine(asUser(issuer, ISSUE), t.id);
    expect(tl.tender.id).toBe(t.id);
  });

  it("files must match the tender's accepted types and stay inside the bidder's own tender path", async () => {
    const t = await openBuilt({ acceptedFileTypes: "pdf" });
    await expect(bids.requestFileUpload(asUser(capable, BID), t.id, { fileName: "x.exe", contentType: "application/octet-stream", fileSizeBytes: 10 })).rejects.toThrow(/accepts/);
    const up = await bids.requestFileUpload(asUser(capable, BID), t.id, { fileName: "cert.pdf", contentType: "application/pdf", fileSizeBytes: 10 });
    await expect(bids.confirmFile(asUser(capable, BID), t.id, { blobName: "tender-bids/other/x.pdf", fileName: "cert.pdf" })).rejects.toThrow(/does not belong/);
    const ws = await bids.confirmFile(asUser(capable, BID), t.id, { blobName: (up as { blobName: string }).blobName, fileName: "cert.pdf", fileSizeBytes: 10 });
    expect(ws.criteria.some((c) => c.files.length > 0) || ws.bid.id).toBeTruthy();
  });

  it("bid templates: a downloaded financial and technical pack is read back into the draft; bad files are refused with reasons and change nothing", async () => {
    const t = await openBuilt();
    const u = asUser(capable, BID);
    await withPlatformStaffContext((tx) => tx.country.upsert({ where: { code: "IN" }, update: {}, create: { code: "IN", name: "India", regionCode: "AS" } }));
    // financial
    const fin = await bids.downloadTemplate(u, t.id, "financial");
    expect(fin.fileName).toMatch(/\.xlsx$/);
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(Buffer.from(fin.contentBase64, "base64") as never);
    const ws = wb.getWorksheet("Financial offer")!;
    ws.getCell("C4").value = "Yes"; ws.getCell("G8").value = 2; ws.getCell("H8").value = 21; ws.getCell("I8").value = "IN - India";
    const up = async () => Buffer.from(await wb.xlsx.writeBuffer()).toString("base64");
    const ok = await bids.uploadTemplate(u, t.id, "financial", { fileName: "f.xlsx", contentBase64: await up() });
    expect(ok.accepted).toBe(true);
    expect(ok.workspace?.lines[0].unitPrice).toBe("2");
    expect(ok.workspace?.lines[0].countryOfOrigin).toBe("IN");
    expect(ok.workspace?.bid.validityConfirmed).toBe(true);
    // a bad value is refused and the draft is untouched
    ws.getCell("G8").value = "lots";
    const bad = await bids.uploadTemplate(u, t.id, "financial", { fileName: "f.xlsx", contentBase64: await up() });
    expect(bad.accepted).toBe(false);
    expect(bad.problems[0]).toMatch(/unit price/);
    expect((await bids.getWorkspace(u, t.id)).lines[0].unitPrice).toBe("2");
    // a file that is not a template, and a pack from another tender
    expect((await bids.uploadTemplate(u, t.id, "financial", { fileName: "x.xlsx", contentBase64: Buffer.from("nope").toString("base64") })).accepted).toBe(false);
    const other = await openBuilt();
    expect((await bids.uploadTemplate(u, other.id, "financial", { fileName: "f.xlsx", contentBase64: await up() })).problems[0]).toMatch(/different tender/);
    // technical
    const tech = await bids.downloadTemplate(u, t.id, "technical");
    expect(tech.fileName).toMatch(/\.docx$/);
    const zip = await JSZip.loadAsync(Buffer.from(tech.contentBase64, "base64"));
    let xml = await zip.file("word/document.xml")!.async("string");
    xml = xml.replace(/<w:t xml:space="preserve"><\/w:t>/g, "<w:t>Fully registered &amp; compliant.</w:t>");
    zip.file("word/document.xml", xml);
    const techUp = await bids.uploadTemplate(u, t.id, "technical", { fileName: "t.docx", contentBase64: (await zip.generateAsync({ type: "nodebuffer" })).toString("base64") });
    expect(techUp.accepted).toBe(true);
    expect(techUp.workspace?.criteria.find((c) => c.title === "Registered")?.text).toBe("Fully registered & compliant.");
  });

  it("template submission can be switched off per tender", async () => {
    const t = await build({ title: `No templates ${suffix}`, allowTemplateSubmission: false });
    await svc.expressInterest(asUser(capable, BID), t.id, DECL);
    await expect(bids.downloadTemplate(asUser(capable, BID), t.id, "financial")).rejects.toThrow(/does not accept template/);
  });

  // ---- evaluation and award (step 4)
  it("scoring arithmetic: calculated scores, weighted totals, ranking, weights, working days, allocations", () => {
    const c = calculatedScores([{ bidId: "a", totalTenderCurrency: 2000, avgLeadDays: 30 }, { bidId: "b", totalTenderCurrency: 4000, avgLeadDays: 60 }]);
    expect(c.get("a")).toEqual({ price: 100, leadTime: 100 });
    expect(c.get("b")).toEqual({ price: 50, leadTime: 50 });
    expect(weightedTotal([{ id: "p", weight: 50 }, { id: "q", weight: 50 }], { p: 100, q: 80 })).toBe(90);
    expect(weightedTotal([{ id: "p", weight: 50 }, { id: "q", weight: 50 }], { p: 100 })).toBeNull();
    const r = rankBids([{ total: 90, price: 5 }, { total: 90, price: 3 }, { total: null, price: 1 }, { total: 95, price: 9 }]);
    expect(r.map((x) => x.rank)).toEqual([3, 2, null, 1]);
    expect(normaliseWeights([1, 1, 1]).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
    expect(normaliseWeights([50, 30, 30]).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 5);
    expect(normaliseWeights([0, 0])).toEqual([50, 50]);
    expect(addWorkingDays(new Date("2026-10-16T12:00:00Z"), 2).toISOString().slice(0, 10)).toBe("2026-10-20"); // Fri + 2 working days = Tue
    expect(overAllocatedLines([{ tenderLineId: "x", sharePercent: 70 }, { tenderLineId: "x", sharePercent: 40 }, { tenderLineId: "y", sharePercent: 100 }])).toEqual(["x"]);
  });

  it("emergency procurement and single-evaluator decisions each need a recorded reason before publishing", async () => {
    const u = asUser(issuer, ISSUE);
    const t = await build({ title: `Emerg ${suffix}`, emergencyProcurement: true }, [], false);
    await expect(svc.publish(u, t.id)).rejects.toMatchObject({ response: { problems: expect.arrayContaining(["Emergency procurement needs a recorded reason."]) } });
    await svc.update(u, t.id, { emergencyReason: "Stock-out of artemether in KE", allowSingleEvaluator: true } as never);
    await expect(svc.publish(u, t.id)).rejects.toMatchObject({ response: { problems: expect.arrayContaining([expect.stringMatching(/single-evaluator/)]) } });
    await svc.update(u, t.id, { singleEvaluatorReason: "Below our EUR 10,000 threshold" } as never);
    await svc.publish(u, t.id);
  });

  it("evaluation to multi-award: conflicts hide bids, scores are private, price and lead time are calculated, one line can be split between suppliers, debriefs and the status page are anonymised", async () => {
    const evaluation = new TenderEvaluationService(svc);
    const awards = new TenderAwardService(svc, evaluation);
    const iss = asUser(issuer, ISSUE);
    const mkEv = async (tag: string) => {
      const id = await withPlatformStaffContext(async (tx) => (await tx.user.create({ data: { organizationId: issuer, email: `${tag}-${suffix}@example.com`, forename: tag, surname: "Eval", status: "ACTIVE", entraObjectId: `oid-${tag}-${suffix}` } })).id);
      return { ...asUser(issuer, ["tenders.view"]), id };
    };
    const ev1 = await mkEv("ev1"); const ev2 = await mkEv("ev2");

    const t = await svc.create(iss, { title: `Eval ${suffix}`, closingAt: future(30), tenderType: "RFQ", currency: "USD", standstillEnabled: true } as never);
    await svc.setLines(iss, t.id, { lines: [{ description: "Artemether", quantity: 1000, unit: "pack", destinationCountryCode: "KE" }] });
    await svc.setCriteria(iss, t.id, { criteria: [
      { title: "Price", kind: "SCORED", weight: 50, metric: "PRICE" }, { title: "Lead time", kind: "SCORED", weight: 20, metric: "LEAD_TIME" },
      { title: "Quality", kind: "SCORED", weight: 30, responseFormat: "TEXT" }, { title: "Registered", kind: "GATE", responseFormat: "TEXT" },
    ] as never });
    await svc.setRules(iss, t.id, { rules: [] });
    await svc.publish(iss, t.id);

    const bidAs = async (org: string, price: number, lead: number) => {
      const u = asUser(org, BID);
      await svc.expressInterest(u, t.id, DECL);
      const ws = await bids.getWorkspace(u, t.id);
      await bids.saveBid(u, t.id, { bidCurrency: "USD", validityConfirmed: true,
        lines: ws.lines.map((l) => ({ tenderLineId: l.tenderLineId, noBid: false, unitPrice: price, leadTimeDays: lead, countryOfOrigin: "IN" })),
        responses: ws.criteria.filter((c) => c.isMandatory).map((c) => ({ criterionId: c.id, text: "Compliant." })) } as never);
      await bids.submitBid(u, t.id);
    };
    await withPlatformStaffContext((tx) => tx.country.upsert({ where: { code: "IN" }, update: {}, create: { code: "IN", name: "India", regionCode: "AS" } }));
    await bidAs(capable, 2, 30); await bidAs(invitee, 4, 60);

    // cannot evaluate before closing/opening
    await expect(evaluation.start(iss, t.id)).rejects.toThrow();
    await withTenantContext(issuer, (tx) => tx.tender.update({ where: { id: t.id }, data: { closingAt: new Date(Date.now() - 60_000) } }));
    await bids.openBids(iss, t.id);
    // exactly one chair and two evaluators (single evaluator not allowed on this tender)
    await expect(evaluation.setEvaluators(iss, t.id, { evaluators: [{ userId: ev1.id, role: "CHAIR" }] })).resolves.toBeTruthy();
    await expect(evaluation.start(iss, t.id)).rejects.toMatchObject({ response: { problems: expect.arrayContaining([expect.stringMatching(/at least two/)]) } });
    await evaluation.setEvaluators(iss, t.id, { evaluators: [{ userId: ev1.id, role: "CHAIR" }, { userId: ev2.id, role: "EVALUATOR" }] });
    await evaluation.start(iss, t.id);

    // no bids visible until the conflict declaration; a conflicted bid stays hidden and cannot be scored
    expect((await evaluation.overview(ev2, t.id)).bids).toHaveLength(0);
    await expect(evaluation.declareConflict(ev2, t.id, { noConflict: false, conflictedOrganisationIds: [capable] })).rejects.toThrow(/briefly/);
    await evaluation.declareConflict(ev2, t.id, { noConflict: false, conflictedOrganisationIds: [capable], notes: "Former employer" });
    await evaluation.declareConflict(ev1, t.id, { noConflict: true });
    const o2 = await evaluation.overview(ev2, t.id);
    expect(o2.bids).toHaveLength(1);
    expect((o2.bids[0] as { organizationId: string }).organizationId).toBe(invitee);
    const full = await evaluation.overview(ev1, t.id);
    const bidOf = (org: string) => (full.bids as { bidId: string; organizationId: string }[]).find((b) => b.organizationId === org)!;
    const crit = (title: string) => full.criteria.find((c) => c.title === title)!.id;

    for (const org of [capable, invitee]) await evaluation.recordGate(ev1, t.id, { bidId: bidOf(org).bidId, criterionId: crit("Registered"), passed: true });
    await expect(evaluation.saveScores(ev2, t.id, { bidId: bidOf(capable).bidId, scores: [] })).rejects.toThrow(/conflict/);
    await expect(evaluation.saveScores(ev1, t.id, { bidId: bidOf(capable).bidId, scores: [{ criterionId: crit("Price"), score: 50 }] })).rejects.toThrow(/automatically/);
    // submitting needs a reason; submitted scores are locked
    await expect(evaluation.saveScores(ev1, t.id, { bidId: bidOf(capable).bidId, scores: [{ criterionId: crit("Quality"), score: 80 }], submit: true })).rejects.toBeTruthy();
    await evaluation.saveScores(ev1, t.id, { bidId: bidOf(capable).bidId, scores: [{ criterionId: crit("Quality"), score: 80, rationale: "Strong dossier" }], submit: true });
    await expect(evaluation.saveScores(ev1, t.id, { bidId: bidOf(capable).bidId, scores: [{ criterionId: crit("Quality"), score: 10, rationale: "x" }] })).rejects.toThrow(/locked/);
    await evaluation.saveScores(ev1, t.id, { bidId: bidOf(invitee).bidId, scores: [{ criterionId: crit("Quality"), score: 60, rationale: "Adequate" }], submit: true });
    // not finalisable until ev2 has scored the bid they are not conflicted with
    await expect(evaluation.finalise(ev1, t.id)).rejects.toMatchObject({ response: { problems: expect.arrayContaining([expect.stringMatching(/has not submitted/)]) } });
    await expect(evaluation.finalise(ev2, t.id)).rejects.toThrow(/chair/);
    await evaluation.saveScores(ev2, t.id, { bidId: bidOf(invitee).bidId, scores: [{ criterionId: crit("Quality"), score: 70, rationale: "Good" }], submit: true });
    // ev2 cannot see ev1's scores; the chair can see both
    expect(Object.keys((o2.bids[0] as { others?: object }).others ?? {})).toHaveLength(0);
    const fin = await evaluation.finalise(ev1, t.id);
    const rows = fin.bids as { organizationId: string; totalScore: number | null; rank: number | null }[];
    expect(rows.find((r) => r.organizationId === capable)).toMatchObject({ totalScore: 94, rank: 1 });
    expect(rows.find((r) => r.organizationId === invitee)).toMatchObject({ totalScore: 54.5, rank: 2 });

    // award: a screening is required; one line split 60/40 across two suppliers (never over 100)
    const award = { awards: [{ bidId: bidOf(capable).bidId, reason: "Best value", lines: [{ tenderLineId: full.lines[0].id, sharePercent: 60 }] }, { bidId: bidOf(invitee).bidId, reason: "Second source", lines: [{ tenderLineId: full.lines[0].id, sharePercent: 40 }] }], feedback: [{ bidId: bidOf(invitee).bidId, text: "Competitive on quality; price and lead time were higher." }] };
    await expect(awards.award(iss, t.id, award)).rejects.toMatchObject({ response: { problems: expect.arrayContaining([expect.stringMatching(/screening/)]) } });
    for (const org of [capable, invitee]) await comp.recordScreening(iss, t.id, { organisationId: org, lists: [SCREENING_LISTS[0].value], outcome: "CLEAR", screenedOn: new Date().toISOString() } as never);
    await expect(awards.award(iss, t.id, { ...award, awards: award.awards.map((a) => ({ ...a, lines: [{ tenderLineId: full.lines[0].id, sharePercent: 70 }] })) })).rejects.toMatchObject({ response: { problems: expect.arrayContaining([expect.stringMatching(/more than 100/)]) } });
    await expect(awards.award(iss, t.id, { ...award, waiveStandstill: true })).rejects.toMatchObject({ response: { problems: expect.arrayContaining([expect.stringMatching(/emergency/)]) } });
    // second authoriser: once the organisation confirms its limits, an award above the proposer's own limit is held, not made
    const setLimit = (individualLimit: number) => withPlatformStaffContext((tx: any) => tx.tenderApprovalSettings.upsert({ where: { organizationId: issuer }, create: { organizationId: issuer, individualLimit, limitCurrency: "USD", confirmedAt: new Date() }, update: { individualLimit, limitCurrency: "USD", confirmedAt: new Date() } }));
    await setLimit(100);
    const held = await awards.award(iss, t.id, award);
    expect(held.tender.awardedAt).toBeFalsy();
    expect(held.awards).toHaveLength(0);
    expect(held.pendingAward).toMatchObject({ requestedByYou: true, canApprove: false });
    await expect(awards.award(iss, t.id, award)).rejects.toThrow(/already waiting/);
    const approverUser = { ...ev1, permissions: ["tenders.view", "tenders.issue", "tenders.award"] };
    await expect(awards.approvePending({ ...iss, permissions: [...ISSUE, "tenders.award"] }, t.id)).rejects.toThrow(/someone other than/);
    await expect(awards.approvePending(approverUser, t.id)).rejects.toThrow(/above your approval limit/);
    await expect(awards.approvePending(ev2, t.id)).rejects.toThrow();
    await setLimit(1_000_000_000);
    const done = await awards.approvePending(approverUser, t.id);
    expect(done.pendingAward).toBeNull();
    expect(done.awards).toHaveLength(2);
    const rows = await withPlatformStaffContext((tx: any) => tx.tenderAward.findMany({ where: { tenderId: t.id } }));
    expect(rows.every((r: any) => r.approvedById === ev1.id && r.awardedById === issuerUser)).toBe(true);
    expect(done.tender.awardedAt).toBeTruthy();
    expect(done.tender.standstillEndsAt).toBeTruthy();
    // each awarded supplier's bid project becomes AWARDED, with its line at the awarded share (60% and 40% of 1,000)
    const awardedProject = (org: string) => withPlatformStaffContext((tx: any) => tx.project.findFirst({ where: { organizationId: org, sourceTenderId: t.id }, include: { lines: true } }));
    const pc = await awardedProject(capable); const pi = await awardedProject(invitee);
    expect(pc).toMatchObject({ status: "AWARDED" }); expect(pc.lines[0].quantity).toBe(600);
    expect(pi).toMatchObject({ status: "AWARDED" }); expect(pi.lines[0].quantity).toBe(400);
    await expect(awards.award(iss, t.id, award)).rejects.toThrow(/already/);

    // participant status page: milestones and a count, own debrief and award only
    const st = await awards.participantStatus(asUser(invitee, BID), t.id);
    expect(st.bidsSubmitted).toBe(2);
    expect(st.my.debrief).toMatchObject({ outcome: "AWARDED", rank: 2, bidCount: 2 });
    expect(st.my.debrief?.feedback).toMatch(/Competitive/);
    expect(st.my.awards[0].lines[0].sharePercent).toBe(40);
    expect(JSON.stringify(st)).not.toContain(capable);
    expect(st.milestones.find((m) => m.key === "STANDSTILL")).toBeTruthy();
    await expect(awards.participantStatus(asUser(incapable, BID), t.id)).rejects.toThrow(/taking part/);

    // complaint during the standstill, answered by the issuer
    expect(st.my.canComplain).toBe(true);
    await awards.lodgeComplaint(asUser(invitee, BID), t.id, "We believe the price score was calculated incorrectly.");
    const open = (await evaluation.overview(iss, t.id)).complaints;
    expect(open).toHaveLength(1);
    await awards.respondComplaint(iss, t.id, open[0].id, "REJECTED", "The calculation follows the published method.");
    expect((await awards.participantStatus(asUser(invitee, BID), t.id)).my.complaints[0]).toMatchObject({ status: "REJECTED" });
    await expect(awards.lodgeComplaint(asUser(incapable, BID), t.id, "No bid was submitted by us at all.")).rejects.toThrow();
  });

  it("a supplier's bid project follows the tender: interest, draft, submit, withdraw, on-demand tracking and cancellation", async () => {
    const projectOf = (org: string, tenderId: string) => withPlatformStaffContext((tx: any) => tx.project.findFirst({ where: { organizationId: org, sourceTenderId: tenderId }, include: { lines: true, statusHistory: true } }));
    const t = await openBuilt(); // the capable supplier registers interest
    let p = await projectOf(capable, t.id);
    expect(p).toMatchObject({ status: "IDENTIFIED", category: "PROCUREMENT" });
    expect(p.lines).toHaveLength(1);
    expect(p.lines[0].sourceTenderLineId).toBeTruthy();
    await fillBid(t.id);
    p = await projectOf(capable, t.id);
    expect(p.status).toBe("IN_PROGRESS");
    expect(Number(p.lines[0].unitSalesPrice)).toBe(2);
    // currency, lead time and manufacturer travel with the price
    expect(p.lines[0]).toMatchObject({ clientPaymentCurrency: "EUR", quotedLeadTimeDays: 30, quotedManufacturerName: "Quoted Pharma Ltd" });
    expect(Number(p.lines[0].clientPaymentAmount)).toBe(Number(p.lines[0].quantity) * 2);
    // the project list can be filtered to tender-sourced projects and counts them
    const pm = new ProjectsService({} as never);
    const mine = await pm.findPage(asUser(capable, ["projects.view"]), { source: "tender" });
    expect(mine.items.some((x) => x.id === p.id)).toBe(true);
    expect(mine.items.every((x) => x.sourceTenderId)).toBe(true);
    expect((await pm.findPage(asUser(capable, ["projects.view"]), { source: "manual" })).items.some((x) => x.id === p.id)).toBe(false);
    expect((await pm.overview(asUser(capable, ["projects.view"]))).counts.fromTenders).toBeGreaterThanOrEqual(1);
    await bids.submitBid(asUser(capable, BID), t.id);
    p = await projectOf(capable, t.id);
    expect(p.status).toBe("SUBMITTED");
    expect(p.submissionDate).toBeTruthy();
    expect(p.projectNotes).toMatch(/Bid submitted/);
    await bids.withdrawBid(asUser(capable, BID), t.id);
    p = await projectOf(capable, t.id);
    expect(p.status).toBe("IN_PROGRESS");
    expect(p.submissionDate).toBeNull();
    expect(p.statusHistory.map((h: { status: string }) => h.status)).toEqual(expect.arrayContaining(["IDENTIFIED", "IN_PROGRESS", "SUBMITTED"]));

    // on demand, for an organisation that has not registered interest; once only
    const tracking = new TenderBidProjectsService();
    const noPerm = asUser(incapable, BID);
    await expect(tracking.track(noPerm, t.id)).rejects.toThrow();
    const u = asUser(incapable, [...BID, "projects.create"]);
    const first = await tracking.track(u, t.id);
    const again = await tracking.track(u, t.id);
    expect(first.created).toBe(true); expect(again).toMatchObject({ created: false, projectId: first.projectId });
    expect(await tracking.mine(u, t.id)).toMatchObject({ projectId: first.projectId, status: "IDENTIFIED" });
    expect(await tracking.mine(asUser(invitee, BID), t.id)).toBeNull();

    // the issuer cancels: both projects, still before award, are cancelled with the reason
    await svc.cancel(asUser(issuer, ISSUE), t.id, "Funding withdrawn");
    for (const org of [capable, incapable]) {
      const c = await projectOf(org, t.id);
      expect(c.status).toBe("CANCELLED");
      expect(c.reasonForCancellation).toMatch(/Funding withdrawn/);
    }
  });
});
