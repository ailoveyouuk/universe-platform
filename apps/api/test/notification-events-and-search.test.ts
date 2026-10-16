import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ProductBatchesService } from "../src/batches/product-batches.service";
import { NotificationsService } from "../src/notifications/notifications.service";
import { ProductCatalogService } from "../src/product-catalog/product-catalog.service";
import { RiskAssessmentsService } from "../src/risk-assessments/risk-assessments.service";
import { SearchService } from "../src/search/search.service";

/**
 * Notification events for risk / logistics / quality, and global search
 * (added 2026-10-17), against the real RLS database.
 */
describe("Notification events (risk, logistics, quality) and global search", () => {
  const suffix = randomUUID().slice(0, 8);
  const notifications = new NotificationsService();
  const risks = new RiskAssessmentsService();
  const batches = new ProductBatchesService();
  const catalog = new ProductCatalogService();
  const search = new SearchService();

  let orgA: string;
  let orgB: string;
  let roleId: string;
  let productId: string;
  const userIds: string[] = [];
  const u: Record<string, RequestUser> = {};

  async function makeUser(orgId: string, tag: string, perms: string[], role?: string): Promise<RequestUser> {
    const user = await withPlatformStaffContext((tx) =>
      tx.user.create({
        data: {
          organizationId: orgId,
          email: `${tag}-${suffix}@example.com`,
          forename: tag,
          surname: "Tester",
          status: "ACTIVE",
          entraObjectId: `oid-${tag}-${suffix}`,
          ...(role ? { userRoles: { create: [{ roleId: role }] } } : {}),
        },
      }),
    );
    userIds.push(user.id);
    return {
      id: user.id,
      organizationId: orgId,
      homeOrganizationId: orgId,
      email: user.email,
      forename: tag,
      surname: "Tester",
      organizationName: "x",
      organizationLogoUrl: null,
      organizationLogoIconUrl: null,
      organizationPrimaryColor: null,
      organizationSecondaryColor: null,
      organizationWelcomeMessage: null,
      platformStaffRole: "NONE",
      permissions: perms,
    };
  }

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Evt A ${suffix}`, slug: `evt-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Evt B ${suffix}`, slug: `evt-b-${suffix}` })).id;
    // A QA role that actually holds products.approve, in the DB (permissions are looked up from it).
    const perm = await withPlatformStaffContext((tx) => tx.permission.findFirstOrThrow({ where: { key: "products.approve" } }));
    roleId = (
      await withPlatformStaffContext((tx) =>
        tx.role.create({ data: { organizationId: orgA, name: `QA ${suffix}`, appScope: "*", rolePermissions: { create: [{ permissionId: perm.id }] } } }),
      )
    ).id;
    u.alice = await makeUser(orgA, "alice", ["projects.edit", "projects.view"]); // an ordinary user
    u.qa = await makeUser(orgA, "qa", ["products.approve"], roleId); // QA reviewer
    u.owner = await makeUser(orgA, "owner", []);
    u.mallory = await makeUser(orgB, "mallory", []);
    productId = (
      await withPlatformStaffContext((tx) =>
        tx.productMaster.create({ data: { name: `Zebra cryovial ${suffix}`, category: "Laboratory Consumables", addedByOrganizationId: orgA } }),
      )
    ).id;
  });

  afterAll(async () => {
    await withPlatformStaffContext(async (tx) => {
      await tx.notification.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.fieldChangeLog.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.batchTemperatureLog.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.productBatch.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.riskAssessment.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.project.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.productAmendment.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.productMaster.deleteMany({ where: { id: productId } });
      await tx.userRole.deleteMany({ where: { userId: { in: userIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
      await tx.rolePermission.deleteMany({ where: { role: { organizationId: { in: [orgA, orgB] } } } });
      await tx.role.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.dataSharingConsent.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await prisma.$disconnect();
  });

  describe("risk", () => {
    it("assigning an owner creates a review action due on the review date; closing closes it", async () => {
      const risk = await risks.create(u.alice, { subjectType: "PROJECT", subjectId: randomUUID(), title: `Cold chain gap ${suffix}`, severity: "HIGH", likelihood: "MEDIUM", ownerId: u.owner.id, reviewDate: "2027-01-15" } as never);
      const mine = await notifications.list(u.owner, "actions");
      const a = mine.find((n) => n.title.includes("Cold chain gap"));
      expect(a).toMatchObject({ kind: "RISK_ASSIGNED", requiresAction: true, actionStatus: "OPEN" });
      expect(a?.dueDate?.startsWith("2027-01-15")).toBe(true);
      expect(await notifications.list(u.alice)).toHaveLength(0);

      await risks.close(u.alice, risk.id, { reason: "Mitigated" } as never);
      const after = await notifications.list(u.owner);
      expect(after.find((n) => n.kind === "RISK_ASSIGNED")?.actionStatus).toBe("DONE");
      expect(after.some((n) => n.kind === "RISK_CLOSED")).toBe(true);
    });

    it("reassigning moves the action to the new owner", async () => {
      const risk = await risks.create(u.alice, { subjectType: "PROJECT", subjectId: randomUUID(), title: `Reassign ${suffix}`, severity: "LOW", likelihood: "LOW", ownerId: u.owner.id } as never);
      await risks.update(u.alice, risk.id, { ownerId: u.qa.id } as never);
      expect((await notifications.list(u.owner, "actions")).some((n) => n.title.includes(`Reassign ${suffix}`))).toBe(false);
      expect((await notifications.list(u.qa, "actions")).some((n) => n.title.includes(`Reassign ${suffix}`))).toBe(true);
    });

    it("never notifies someone outside the organisation, even if their id is supplied", async () => {
      await risks.create(u.alice, { subjectType: "PROJECT", subjectId: randomUUID(), title: `Leak ${suffix}`, severity: "LOW", likelihood: "LOW", ownerId: u.mallory.id } as never);
      expect(await notifications.list(u.mallory)).toHaveLength(0);
    });
  });

  describe("logistics", () => {
    it("a temperature excursion asks QA reviewers to review it; reviewing closes everyone's action", async () => {
      const batch = await batches.create(u.alice, { batchNumber: `B-${suffix}` } as never);
      const log = await batches.addTemperatureLog(u.alice, batch.id, { hasExcursion: true, excursionNotes: "+11C for 40 min" } as never);
      const qaActions = await notifications.list(u.qa, "actions");
      expect(qaActions.find((n) => n.kind === "TEMPERATURE_EXCURSION")).toMatchObject({ requiresAction: true, link: `/batches/detail?id=${batch.id}` });
      expect((await notifications.list(u.alice)).some((n) => n.kind === "TEMPERATURE_EXCURSION")).toBe(false);

      await batches.reviewTemperatureLog(u.qa, log.id, {} as never);
      expect((await notifications.list(u.qa)).find((n) => n.kind === "TEMPERATURE_EXCURSION")?.actionStatus).toBe("DONE");
    });

    it("a normal reading raises nothing; quarantining a batch tells QA", async () => {
      const batch = await batches.create(u.alice, { batchNumber: `Q-${suffix}` } as never);
      const before = (await notifications.list(u.qa)).length;
      await batches.addTemperatureLog(u.alice, batch.id, { hasExcursion: false } as never);
      expect((await notifications.list(u.qa)).length).toBe(before);
      await batches.update(u.alice, batch.id, { status: "QUARANTINED" } as never);
      expect((await notifications.list(u.qa)).some((n) => n.kind === "BATCH_STATUS_CHANGED" && n.title.includes(`Q-${suffix}`))).toBe(true);
    });
  });

  describe("quality", () => {
    it("a proposed product amendment asks QA to review; the decision closes it and tells the submitter", async () => {
      const r = await catalog.update(u.alice, productId, { name: `Zebra cryovial v2 ${suffix}` } as never);
      expect(r.status).toBe("PENDING_AMENDMENT");
      const amendmentId = (r as { amendmentId: string }).amendmentId;
      const act = (await notifications.list(u.qa, "actions")).find((n) => n.kind === "AMENDMENT_REVIEW");
      expect(act).toBeTruthy();

      await catalog.rejectAmendment(u.qa, amendmentId, { notes: "Name is not standard" } as never);
      expect((await notifications.list(u.qa)).find((n) => n.kind === "AMENDMENT_REVIEW")?.actionStatus).toBe("DONE");
      const alices = await notifications.list(u.alice);
      expect(alices.find((n) => n.kind === "AMENDMENT_DECISION")?.title).toContain("rejected");
    });
  });

  describe("global search", () => {
    it("finds this organisation's records and the shared catalogue", async () => {
      await withPlatformStaffContext((tx) =>
        tx.project.create({ data: { organizationId: orgA, referenceNumber: `SRCH-${suffix}`, title: "Quokka vaccines", category: "PROCUREMENT", projectType: "PHARMACEUTICAL" } }),
      );
      const projectHit = await search.search(u.alice, "Quokka");
      expect(projectHit.results.some((r) => r.type === "project" && r.link.startsWith("/projects/detail?id="))).toBe(true);
      const batchHit = await search.search(u.alice, `B-${suffix}`);
      expect(batchHit.results.some((r) => r.type === "batch")).toBe(true);
      const productHit = await search.search(u.alice, "Zebra cryovial");
      expect(productHit.results.some((r) => r.type === "product" && r.app === "product-database")).toBe(true);
    });

    it("never returns another organisation's records", async () => {
      expect((await search.search(u.mallory, "Quokka")).results.filter((r) => r.type !== "product")).toHaveLength(0);
      expect((await search.search(u.mallory, `B-${suffix}`)).results).toHaveLength(0);
    });

    it("ignores one-character queries", async () => {
      expect((await search.search(u.alice, "a")).results).toHaveLength(0);
    });
  });
});
