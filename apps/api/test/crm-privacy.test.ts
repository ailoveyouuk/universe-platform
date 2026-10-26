import { randomUUID } from "node:crypto";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { CrmInteractionsService } from "../src/crm/crm-interactions.service";
import { CrmPrivacyService, hashEmail } from "../src/crm/crm-privacy.service";

/** CRM privacy tools against the real RLS database: lawful basis, objection, irreversible anonymisation, the request clock, subject-access search. */
describe("CRM privacy", () => {
  const suffix = randomUUID().slice(0, 8);
  const svc = new CrmPrivacyService();
  const inter = new CrmInteractionsService();
  let orgA: string; let orgB: string; let relA: string;
  const userIds: string[] = []; const u: Record<string, RequestUser> = {};
  const contactIds: Record<string, string> = {};
  const email = (tag: string) => `${tag}.${suffix}@supplier.example`;

  async function makeUser(orgId: string, tag: string, permissions: string[]): Promise<RequestUser> {
    const user = await withPlatformStaffContext((tx) => tx.user.create({ data: { organizationId: orgId, email: `${tag}-${suffix}@example.com`, forename: tag, surname: "Tester", status: "ACTIVE", entraObjectId: `oid-${tag}-${suffix}` } }));
    userIds.push(user.id);
    return { id: user.id, organizationId: orgId, homeOrganizationId: orgId, email: user.email, forename: tag, surname: "Tester", organizationName: "x", organizationLogoUrl: null, organizationLogoIconUrl: null,
      organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null, platformStaffRole: "NONE", permissions, apps: null } as RequestUser;
  }

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Priv A ${suffix}`, slug: `priv-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Priv B ${suffix}`, slug: `priv-b-${suffix}` })).id;
    u.manager = await makeUser(orgA, "manager", ["crm.view", "crm.manage"]);
    u.viewer = await makeUser(orgA, "viewer", ["crm.view"]);
    u.other = await makeUser(orgB, "other", ["crm.view", "crm.manage"]);
    await withPlatformStaffContext(async (tx) => {
      const p = await tx.partner.create({ data: { organizationId: orgA, name: `Acme ${suffix}`, normalizedName: `acme ${suffix}` } });
      relA = (await tx.crmRelationship.create({ data: { organizationId: orgA, partnerId: p.id, counterpartyKey: `partner:${p.id}` } })).id;
      for (const tag of ["jane", "omar", "lena"]) {
        contactIds[tag] = (await tx.contact.create({ data: { organizationId: orgA, partnerId: p.id, name: `${tag[0].toUpperCase()}${tag.slice(1)} Example${suffix}`, email: email(tag), phone: "07000 000000", title: "Manager" } })).id;
      }
      await tx.fieldChangeLog.create({ data: { organizationId: orgA, tableName: "contacts", recordId: contactIds.jane, fieldName: "email", oldValue: "old.jane@supplier.example", newValue: email("jane"), changedById: u.manager.id, source: "API" } });
    });
  });

  afterAll(async () => {
    await withPlatformStaffContext(async (tx) => {
      const orgs = { in: [orgA, orgB] };
      await tx.fieldChangeLog.deleteMany({ where: { organizationId: orgs } });
      await tx.crmAccessLog.deleteMany({ where: { organizationId: orgs } });
      await tx.crmSuppression.deleteMany({ where: { organizationId: orgs } });
      await tx.crmPrivacyRequest.deleteMany({ where: { organizationId: orgs } });
      await tx.crmContactProfile.deleteMany({ where: { organizationId: orgs } });
      await tx.crmInteraction.deleteMany({ where: { organizationId: orgs } });
      await tx.crmRelationship.deleteMany({ where: { organizationId: orgs } });
      await tx.contact.deleteMany({ where: { organizationId: orgs } });
      await tx.partner.deleteMany({ where: { organizationId: orgs } });
      await tx.userRole.deleteMany({ where: { userId: { in: userIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
      await tx.rolePermission.deleteMany({ where: { role: { organizationId: orgs } } });
      await tx.role.deleteMany({ where: { organizationId: orgs } });
      await tx.dataSharingConsent.deleteMany({ where: { organizationId: orgs } });
    });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await prisma.$disconnect();
  });

  it("lists people with a default lawful basis, logs the view, and saves a profile with an audit trail", async () => {
    const people = await svc.people(u.viewer, relA);
    expect(people).toHaveLength(3);
    expect(people[0]).toMatchObject({ lawfulBasis: "LEGITIMATE_INTERESTS", status: "ACTIVE", suppressed: false });
    await expect(svc.updateProfile(u.viewer, contactIds.omar, { decisionRole: "BUDGET_HOLDER" })).rejects.toThrow();
    const p = await svc.updateProfile(u.manager, contactIds.omar, { decisionRole: "BUDGET_HOLDER", lawfulBasisReason: "Supplies our stock", markVerified: true });
    expect(p).toMatchObject({ decisionRole: "BUDGET_HOLDER", lawfulBasisReason: "Supplies our stock" });
    expect(p.lastVerifiedAt).not.toBeNull();
    const log = await svc.accessLog(u.manager);
    expect(log.map((l) => l.action)).toEqual(expect.arrayContaining(["VIEW_PEOPLE", "EDIT_PROFILE"]));
  });

  it("an objection locks the record and puts only a hash of the email on the suppression list", async () => {
    const p = await svc.object(u.manager, contactIds.lena);
    expect(p.status).toBe("OBJECTED");
    await expect(svc.updateProfile(u.manager, contactIds.lena, { decisionRole: "OTHER" })).rejects.toBeInstanceOf(BadRequestException);
    const rows = await withPlatformStaffContext((tx) => tx.crmSuppression.findMany({ where: { organizationId: orgA } }));
    expect(rows.map((r) => r.emailHash)).toContain(hashEmail(email("lena")));
    expect(JSON.stringify(rows)).not.toContain("lena");
    expect((await svc.people(u.manager, relA)).find((x) => x.id === contactIds.lena)?.suppressed).toBe(true);
  });

  it("anonymises in place: contact, interaction text and participant lists, change log, with a suppression entry kept", async () => {
    const janeName = `Jane Example${suffix}`;
    const i = await inter.create(u.manager, relA, { type: "MEETING", occurredAt: new Date().toISOString().slice(0, 10), title: `Call with ${janeName}`, summary: `${janeName} (${email("jane")}) agreed new terms. Omar was also there.`, contactIds: [contactIds.jane, contactIds.omar] });
    await expect(svc.anonymise(u.manager, contactIds.jane, {})).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.anonymise(u.other, contactIds.jane, { reason: "x" })).rejects.toBeInstanceOf(NotFoundException);
    const r = await svc.anonymise(u.manager, contactIds.jane, { reason: "Erasure request" });
    expect(r.interactionsScrubbed).toBe(1);
    const state = await withPlatformStaffContext(async (tx) => ({
      contact: await tx.contact.findUnique({ where: { id: contactIds.jane } }),
      inter: await tx.crmInteraction.findUnique({ where: { id: i.id } }),
      log: await tx.fieldChangeLog.findFirst({ where: { organizationId: orgA, tableName: "contacts", recordId: contactIds.jane } }),
      profile: await tx.crmContactProfile.findFirst({ where: { contactId: contactIds.jane } }),
      sup: await tx.crmSuppression.findFirst({ where: { organizationId: orgA, emailHash: hashEmail(email("jane")) } }),
    }));
    expect(state.contact).toMatchObject({ name: "Anonymised contact", email: null, phone: null, title: null });
    expect(state.inter?.title).not.toContain("Jane");
    expect(state.inter?.summary).not.toContain(email("jane"));
    expect(state.inter?.summary).toContain("Omar");
    expect(JSON.parse(state.inter?.contactIds ?? "[]")).toEqual([contactIds.omar]);
    expect(state.log).toMatchObject({ oldValue: "[anonymised]", newValue: "[anonymised]" });
    expect(state.profile?.status).toBe("ANONYMISED");
    expect(state.sup).not.toBeNull();
    await expect(svc.anonymise(u.manager, contactIds.jane, { reason: "again" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("finds a person and prepares an access copy, logging both", async () => {
    await expect(svc.findPerson(u.manager, "ab")).rejects.toBeInstanceOf(BadRequestException);
    const found = await svc.findPerson(u.manager, `Omar Example${suffix}`);
    expect(found).toHaveLength(1);
    expect(found[0].interactions).toBeGreaterThanOrEqual(1);
    const copy = await svc.accessCopy(u.manager, contactIds.omar);
    expect(copy.contact).toMatchObject({ email: email("omar") });
    expect(copy.interactions.length).toBeGreaterThanOrEqual(1);
    const actions = (await svc.accessLog(u.manager)).map((l) => l.action);
    expect(actions).toEqual(expect.arrayContaining(["SEARCH_PERSON", "EXPORT_COPY", "ANONYMISE", "OBJECTION"]));
    await expect(svc.findPerson(u.viewer, "omar")).rejects.toThrow();
  });

  it("runs the request clock: one month, pausable, extendable once, closing needs a decision", async () => {
    const r = await svc.createRequest(u.manager, { type: "ACCESS", requesterName: "Someone", receivedAt: "2026-10-01" });
    expect(r.dueAt.slice(0, 10)).toBe("2026-11-01");
    const ext = await svc.updateRequest(u.manager, r.id, { extendTwoMonths: true });
    expect(ext.dueAt.slice(0, 10)).toBe("2027-01-01");
    await expect(svc.updateRequest(u.manager, r.id, { extendTwoMonths: true })).rejects.toBeInstanceOf(BadRequestException);
    const paused = await svc.updateRequest(u.manager, r.id, { pauseClock: true });
    expect(paused.status).toBe("WAITING"); expect(paused.overdue).toBe(false);
    const back = await svc.updateRequest(u.manager, r.id, { resumeClock: true });
    expect(back.status).toBe("OPEN");
    await expect(svc.updateRequest(u.manager, r.id, { status: "COMPLETED" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.updateRequest(u.manager, r.id, { status: "REFUSED", decision: "No" })).rejects.toBeInstanceOf(BadRequestException);
    const done = await svc.updateRequest(u.manager, r.id, { status: "COMPLETED", decision: "Sent a copy" });
    expect(done.status).toBe("COMPLETED");
    await expect(svc.updateRequest(u.manager, r.id, { identityConfirmed: true })).rejects.toBeInstanceOf(BadRequestException);
    expect((await svc.requests(u.other)).length).toBe(0);
  });
});
