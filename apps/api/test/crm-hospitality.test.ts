import { randomUUID } from "node:crypto";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { CrmHospitalityService } from "../src/crm/crm-hospitality.service";

/** Gifts and hospitality: policy, judgement, approval by a different person, locking and tenant isolation against the real RLS database. */
describe("CRM gifts and hospitality", () => {
  const suffix = randomUUID().slice(0, 8);
  const svc = new CrmHospitalityService();
  let orgA: string; let orgB: string; let relA: string; let relB: string;
  const userIds: string[] = [];
  const u: Record<string, RequestUser> = {};
  const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  const input = (o: Record<string, unknown> = {}) => ({ direction: "RECEIVED", category: "GIFT", occurredOn: day(1), description: "Box of stationery", businessReason: "Courtesy after a meeting", amount: 10, currency: "GBP", ...o }) as never;

  async function makeUser(orgId: string, tag: string, permissions: string[]): Promise<RequestUser> {
    const user = await withPlatformStaffContext((tx) => tx.user.create({ data: { organizationId: orgId, email: `${tag}-${suffix}@example.com`, forename: tag, surname: "Tester", status: "ACTIVE", entraObjectId: `oid-${tag}-${suffix}` } }));
    userIds.push(user.id);
    return { id: user.id, organizationId: orgId, homeOrganizationId: orgId, email: user.email, forename: tag, surname: "Tester", organizationName: "x", organizationLogoUrl: null, organizationLogoIconUrl: null,
      organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null, platformStaffRole: "NONE", permissions, apps: null } as RequestUser;
  }

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Gh A ${suffix}`, slug: `gh-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Gh B ${suffix}`, slug: `gh-b-${suffix}` })).id;
    u.maker = await makeUser(orgA, "maker", ["crm.view", "crm.manage"]);
    u.checker = await makeUser(orgA, "checker", ["crm.view", "crm.manage"]);
    u.viewer = await makeUser(orgA, "viewer", ["crm.view"]);
    u.other = await makeUser(orgB, "other", ["crm.view", "crm.manage"]);
    await withPlatformStaffContext(async (tx) => {
      const mgr = await tx.role.findFirst({ where: { organizationId: orgA, rolePermissions: { some: { permission: { key: "crm.manage" } } } }, select: { id: true } });
      if (!mgr) throw new Error("No role with crm.manage in the new organisation.");
      for (const k of ["maker", "checker"]) await tx.userRole.create({ data: { userId: u[k].id, roleId: mgr.id } });
      const pa = await tx.partner.create({ data: { organizationId: orgA, name: `Acme ${suffix}`, normalizedName: `acme ${suffix}` } });
      const pb = await tx.partner.create({ data: { organizationId: orgB, name: `Beta ${suffix}`, normalizedName: `beta ${suffix}` } });
      relA = (await tx.crmRelationship.create({ data: { organizationId: orgA, partnerId: pa.id, counterpartyKey: `partner:${pa.id}` } })).id;
      relB = (await tx.crmRelationship.create({ data: { organizationId: orgB, partnerId: pb.id, counterpartyKey: `partner:${pb.id}` } })).id;
    });
  });

  afterAll(async () => {
    await withPlatformStaffContext(async (tx) => {
      const orgs = { in: [orgA, orgB] };
      await tx.notification.deleteMany({ where: { organizationId: orgs } });
      await tx.fieldChangeLog.deleteMany({ where: { organizationId: orgs } });
      await tx.crmHospitalityRecord.deleteMany({ where: { organizationId: orgs } });
      await tx.crmGiftPolicy.deleteMany({ where: { organizationId: orgs } });
      await tx.projectDocument.deleteMany({ where: { organizationId: orgs } });
      await tx.crmRelationship.deleteMany({ where: { organizationId: orgs } });
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

  it("uses stated defaults until the organisation sets its own, and only managers can set them", async () => {
    const d = await svc.policy(u.viewer);
    expect(d.confirmed).toBe(false); expect(d.giftThreshold).toBe(50);
    await expect(svc.savePolicy(u.viewer, { giftThreshold: 10 })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.savePolicy(u.maker, { giftThreshold: -1 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.savePolicy(u.maker, { currency: "pounds" })).rejects.toBeInstanceOf(BadRequestException);
    const p = await svc.savePolicy(u.maker, { giftThreshold: 40, hospitalityThreshold: 120, annualThreshold: 200, policyTitle: "Anti-bribery policy", policyVersion: "2" });
    expect(p.confirmed).toBe(true); expect(p.giftThreshold).toBe(40); expect(p.policyTitle).toBe("Anti-bribery policy");
    expect((await svc.policy(u.viewer)).hospitalityThreshold).toBe(120);
  });

  it("only people in the organisation can be approvers, and a policy document must exist", async () => {
    await expect(svc.savePolicy(u.maker, { approverUserIds: [u.viewer.id] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.savePolicy(u.maker, { approverUserIds: [u.other.id] })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.savePolicy(u.maker, { policyDocumentId: randomUUID() })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("a small gift is recorded; a large one waits for approval and says why", async () => {
    const small = await svc.create(u.maker, relA, input({ amount: 10 }));
    expect(small.status).toBe("RECORDED");
    const big = await svc.create(u.maker, relA, input({ amount: 90, description: "Watch" }));
    expect(big.status).toBe("PENDING_APPROVAL"); expect(big.approvalReasons.join(" ")).toContain("gift threshold");
    const note = await withPlatformStaffContext((tx) => tx.notification.findFirst({ where: { organizationId: orgA, subjectId: big.id, requiresAction: true } }));
    expect(note?.recipientUserId).toBe(u.checker.id);
  });

  it("validates the form", async () => {
    await expect(svc.create(u.maker, relA, input({ businessReason: " " }))).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.create(u.maker, relA, input({ amount: -5 }))).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.create(u.maker, relA, input({ occurredOn: day(-30) }))).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.create(u.maker, relA, input({ currency: "x" }))).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.create(u.viewer, relA, input())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("the person who recorded it cannot approve it; another can; the decision locks the details", async () => {
    const r = await svc.create(u.maker, relA, input({ amount: 75, description: "Dinner voucher" }));
    await expect(svc.decide(u.maker, r.id, { decision: "APPROVED" })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.decide(u.viewer, r.id, { decision: "APPROVED" })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.decide(u.checker, r.id, { decision: "REJECTED" })).rejects.toBeInstanceOf(BadRequestException);
    const done = await svc.decide(u.checker, r.id, { decision: "APPROVED", note: "Within the spirit of the policy" });
    expect(done.status).toBe("APPROVED"); expect(done.decidedByName).toContain("checker");
    await expect(svc.decide(u.checker, r.id, { decision: "APPROVED" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.update(u.maker, r.id, { amount: 1 })).rejects.toBeInstanceOf(BadRequestException);
    expect((await svc.update(u.maker, r.id, { additionalInfo: "Receipt on file" })).additionalInfo).toBe("Receipt on file");
    const open = await withPlatformStaffContext((tx) => tx.notification.count({ where: { organizationId: orgA, subjectId: r.id, requiresAction: true, actionStatus: "OPEN" } }));
    expect(open).toBe(0);
  });

  it("only named approvers can decide when the policy names them", async () => {
    await svc.savePolicy(u.maker, { approverUserIds: [u.maker.id] });
    const r = await svc.create(u.maker, relA, input({ amount: 500, description: "Conference ticket", category: "EVENT" }));
    await expect(svc.decide(u.checker, r.id, { decision: "APPROVED" })).rejects.toBeInstanceOf(ForbiddenException);
    await svc.savePolicy(u.maker, { approverUserIds: [] });
    expect((await svc.decide(u.checker, r.id, { decision: "REJECTED", note: "Too lavish" })).status).toBe("REJECTED");
  });

  it("public officials, donations and a declined offer", async () => {
    expect((await svc.create(u.maker, relA, input({ amount: 0, publicOfficial: true }))).status).toBe("PENDING_APPROVAL");
    expect((await svc.create(u.maker, relA, input({ amount: 5, category: "DONATION" }))).status).toBe("PENDING_APPROVAL");
    expect((await svc.create(u.maker, relA, input({ direction: "DECLINED", amount: 900, publicOfficial: true }))).status).toBe("RECORDED");
  });

  it("the yearly total for one stakeholder counts, and editing re-judges a record that has not been decided", async () => {
    const r = await svc.create(u.maker, relA, input({ amount: 30, description: "Small thing" }));
    expect(r.status).toBe("RECORDED");
    const up = await svc.update(u.maker, r.id, { amount: 80 });
    expect(up.status).toBe("PENDING_APPROVAL");
    const back = await svc.update(u.maker, r.id, { amount: 20 });
    expect(back.status).toBe("RECORDED");
  });

  it("lists with filters, summarises, archives and keeps the audit trail", async () => {
    const list = await svc.list(u.viewer, { relationshipId: relA, status: "PENDING_APPROVAL" });
    expect(list.items.length).toBeGreaterThan(0); expect(list.items.every((i) => i.status === "PENDING_APPROVAL")).toBe(true);
    expect(list.items[0].canDecide).toBe(false);
    const s = await svc.summary(u.checker);
    expect(s.pendingApproval).toBeGreaterThan(0); expect(s.awaitingMyDecision).toBeGreaterThan(0); expect(s.publicOfficialLast12Months).toBeGreaterThan(0);
    const target = list.items[0];
    await svc.update(u.maker, target.id, { archived: true });
    expect((await svc.list(u.viewer, { relationshipId: relA })).items.find((i) => i.id === target.id)).toBeUndefined();
    const log = await withPlatformStaffContext((tx) => tx.fieldChangeLog.count({ where: { organizationId: orgA, tableName: "crm_hospitality_records", recordId: target.id } }));
    expect(log).toBeGreaterThan(0);
    expect(await withPlatformStaffContext((tx) => tx.crmHospitalityRecord.count({ where: { id: target.id } }))).toBe(1);
  });

  it("another organisation sees and changes nothing", async () => {
    await expect(svc.create(u.other, relA, input())).rejects.toBeInstanceOf(NotFoundException);
    const mine = await svc.create(u.other, relB, input({ amount: 5 }));
    expect((await svc.list(u.other, {})).items.map((i) => i.id)).toEqual([mine.id]);
    await expect(svc.decide(u.other, (await svc.list(u.maker, { relationshipId: relA })).items[0].id, { decision: "APPROVED" })).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.update(u.other, (await svc.list(u.maker, { relationshipId: relA })).items[0].id, { additionalInfo: "x" })).rejects.toBeInstanceOf(NotFoundException);
    expect((await svc.policy(u.other)).confirmed).toBe(false);
  });

  it("a file can be opened only when the policy or a record points at it", async () => {
    const doc = await withPlatformStaffContext((tx) => tx.projectDocument.create({ data: { organizationId: orgA, projectId: null, type: "EVIDENCE", title: "Policy", url: "https://example.com/policy.pdf", uploadedById: u.maker.id } }));
    await expect(svc.assertDocumentVisible(u.viewer, doc.id)).rejects.toBeInstanceOf(NotFoundException);
    await svc.savePolicy(u.maker, { policyDocumentId: doc.id });
    await expect(svc.assertDocumentVisible(u.viewer, doc.id)).resolves.toBeUndefined();
    await expect(svc.assertDocumentVisible(u.other, doc.id)).rejects.toBeInstanceOf(NotFoundException);
    await svc.savePolicy(u.maker, { policyDocumentId: null });
    await withPlatformStaffContext((tx) => tx.projectDocument.deleteMany({ where: { id: doc.id } }));
  });
});
