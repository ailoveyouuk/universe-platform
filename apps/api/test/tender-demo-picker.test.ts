import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, withPlatformStaffContext } from "@universe/db";
import { beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { TenderEvaluationService } from "../src/tenders/tender-evaluation.service";
import { TendersService } from "../src/tenders/tenders.service";

/**
 * The evaluator picker in a demo organisation: a normal (non-staff) user holding an access grant to the demo organisation can be picked
 * as chair or evaluator, someone without a grant cannot, and a non-demo organisation never lists visitors.
 */
describe("Evaluator picker, non-staff demo visitors", () => {
  const suffix = randomUUID().slice(0, 8);
  const svc = new TendersService();
  const evaluation = new TenderEvaluationService(svc);
  let demoOrg = "", realOrg = "", otherOrg = "";
  let demoOwner = "", realOwner = "", visitor = "", stranger = "";
  let demoTender = "", realTender = "";
  const as = (organizationId: string, id: string): RequestUser => ({
    id, organizationId, homeOrganizationId: organizationId, email: `p-${id.slice(0, 6)}@example.com`, forename: "Pick", surname: "Tester",
    organizationName: "Org", organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null,
    platformStaffRole: "NONE", permissions: ["tenders.view", "tenders.issue"],
  });

  beforeAll(async () => {
    demoOrg = (await createOrganizationWithDefaultRoles({ name: `Pick Demo ${suffix}`, slug: `pk-demo-${suffix}`, type: "TENDERING_PURCHASING_BODY" })).id;
    realOrg = (await createOrganizationWithDefaultRoles({ name: `Pick Real ${suffix}`, slug: `pk-real-${suffix}`, type: "TENDERING_PURCHASING_BODY" })).id;
    otherOrg = (await createOrganizationWithDefaultRoles({ name: `Pick Other ${suffix}`, slug: `pk-oth-${suffix}`, type: "SUPPLIER" })).id;
    await withPlatformStaffContext(async (tx) => {
      await tx.organization.update({ where: { id: demoOrg }, data: { isDemo: true } });
      const mk = async (organizationId: string, tag: string) => (await tx.user.create({ data: { organizationId, email: `${tag}-${suffix}@example.com`, forename: tag, surname: "Picker", status: "ACTIVE", entraObjectId: `oid-pk-${tag}-${suffix}` } })).id;
      demoOwner = await mk(demoOrg, "owner"); realOwner = await mk(realOrg, "realowner"); visitor = await mk(otherOrg, "visitor"); stranger = await mk(otherOrg, "stranger");
      // the visitor holds a demo-picker grant to the demo organisation and also (to prove it changes nothing) to the real one
      await tx.userOrganizationAccess.create({ data: { userId: visitor, grantedOrganizationId: demoOrg, grantedBy: "test" } });
      await tx.userOrganizationAccess.create({ data: { userId: visitor, grantedOrganizationId: realOrg, grantedBy: "test" } });
    });
    const future = new Date(Date.now() + 30 * 86_400_000).toISOString();
    demoTender = (await svc.create(as(demoOrg, demoOwner), { title: `Picker demo ${suffix}`, closingAt: future, tenderType: "RFQ", currency: "USD" } as never)).id;
    realTender = (await svc.create(as(realOrg, realOwner), { title: `Picker real ${suffix}`, closingAt: future, tenderType: "RFQ", currency: "USD" } as never)).id;
  });

  it("lists the organisation's own users and a granted non-staff visitor in a demo organisation, but not a stranger", async () => {
    const found = await evaluation.listCandidates(as(demoOrg, demoOwner), demoTender, "");
    const ids = found.map((c) => c.id);
    expect(ids).toContain(demoOwner);
    expect(ids).toContain(visitor);
    expect(ids).not.toContain(stranger);
  });

  it("finds the visitor by name search", async () => {
    const found = await evaluation.listCandidates(as(demoOrg, demoOwner), demoTender, "visitor");
    expect(found.map((c) => c.id)).toEqual([visitor]);
  });

  it("never lists visitors for a non-demo organisation, even with a grant", async () => {
    const ids = (await evaluation.listCandidates(as(realOrg, realOwner), realTender, "")).map((c) => c.id);
    expect(ids).toContain(realOwner);
    expect(ids).not.toContain(visitor);
  });
});
