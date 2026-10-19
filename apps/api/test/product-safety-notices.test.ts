import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ProductCatalogService } from "../src/product-catalog/product-catalog.service";
import { familyTarget, productTarget } from "../src/product-catalog/product-target";
import { computeCompliance } from "../src/product-catalog/product-registrations.service";
import { ProductSafetyNoticesService } from "../src/product-catalog/product-safety-notices.service";

/** Safety notices and recalls: shared notice, private per-organisation review, compliance, notifications (2026-10-18). Real RLS database. */
describe("Product safety notices", () => {
  const suffix = randomUUID().slice(0, 8);
  const safety = new ProductSafetyNoticesService();
  const catalogue = new ProductCatalogService();
  let orgA: string;
  let orgB: string;
  let userA: string;
  let userB: string;
  let productId: string;
  let siblingId: string;
  let familyId: string;

  const asUser = (organizationId: string, id: string, staff = false, permissions = ["projects.edit", "products.approve"]): RequestUser => ({
    id, organizationId, homeOrganizationId: organizationId, email: `sn-${id}@example.com`, forename: "Safety", surname: "Tester",
    organizationName: organizationId === orgA ? "Org A" : "Org B", organizationLogoUrl: null, organizationLogoIconUrl: null,
    organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null,
    platformStaffRole: staff ? "SUPER_ADMIN" : "NONE", permissions,
  });

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Sn A ${suffix}`, slug: `sn-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Sn B ${suffix}`, slug: `sn-b-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      userA = (await tx.user.create({ data: { organizationId: orgA, email: `sna-${suffix}@example.com`, forename: "Sn", surname: "A" } })).id;
      userB = (await tx.user.create({ data: { organizationId: orgB, email: `snb-${suffix}@example.com`, forename: "Sn", surname: "B", status: "ACTIVE" } })).id;
      familyId = (await tx.productFamily.create({ data: { name: `Safety family ${suffix}`, category: "Medical Devices" } })).id;
      productId = (await tx.productMaster.create({ data: { name: `Safety device ${suffix} 10 mg`, category: "Medical Devices", sourceStandard: "TEST", addedByOrganizationId: orgA, productFamilyId: familyId } })).id;
      siblingId = (await tx.productMaster.create({ data: { name: `Safety device ${suffix} 20 mg`, category: "Medical Devices", sourceStandard: "TEST", addedByOrganizationId: orgA, productFamilyId: familyId } })).id;
      // Organisation B uses the product as an approved source, and has a QA reviewer.
      const maker = await tx.partner.create({ data: { organizationId: orgB, name: `Maker ${suffix}`, normalizedName: `maker ${suffix}` } });
      await tx.productSourceApproval.create({ data: { organizationId: orgB, productMasterId: productId, manufacturerId: maker.id, status: "APPROVED", approvedAt: new Date() } });
      const perm = await tx.permission.upsert({ where: { key: "products.approve" }, update: {}, create: { key: "products.approve", description: "QA" } });
      const role = await tx.role.create({ data: { organizationId: orgB, name: `QA ${suffix}`, appScope: "PRODUCT_DATABASE" } });
      await tx.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
      await tx.userRole.create({ data: { userId: userB, roleId: role.id } });
    });
  });

  afterAll(async () => { await prisma.$disconnect(); });

  it("compliance: open critical notice blocks, other open notices warn", () => {
    const far = new Date(Date.now() + 86400000 * 500);
    const regs = [{ status: "ACTIVE", expiryDate: far, authority: "FDA", referenceNumber: "K1" }];
    expect(computeCompliance("ACTIVE", regs, Date.now(), [{ severity: "CRITICAL", noticeType: "RECALL", title: "Class I" }]).status).toBe("BLOCKED");
    expect(computeCompliance("ACTIVE", regs, Date.now(), [{ severity: "MEDIUM", noticeType: "SAFETY_ALERT", title: "Advisory" }]).status).toBe("WARNING");
    expect(computeCompliance("ACTIVE", regs, Date.now(), []).status).toBe("OK");
  });

  it("needs QA permission to record, and refuses future dates", async () => {
    const input = { noticeType: "RECALL", severity: "CRITICAL", authority: "FDA", title: "Class I recall", summary: "Seal failure on some lots.", issueDate: "2026-10-01" };
    await expect(safety.create(asUser(orgA, userA, false, ["projects.edit"]), productTarget(productId), input)).rejects.toThrow();
    await expect(safety.create(asUser(orgA, userA), productTarget(productId), { ...input, issueDate: "2999-01-01" })).rejects.toThrow(/future/i);
  });

  it("a recall on a variant is shared, blocks the product, audited, and notifies the other organisation's QA", async () => {
    const created = await safety.create(asUser(orgA, userA), productTarget(productId), {
      noticeType: "RECALL", severity: "CRITICAL", authority: "FDA", referenceNumber: `Z-${suffix}`, title: `Class I recall ${suffix}`, summary: "Seal failure on some lots.", affectedBatches: "L100, L101", countryCodes: "us, gb", issueDate: "2026-10-01",
    });
    expect(created.status).toBe("OPEN");
    expect(created.countryCodes).toBe("US,GB");
    expect(created.needsReview).toBe(true);
    const seenByB = await safety.list(asUser(orgB, userB), productTarget(productId));
    expect(seenByB.map((n) => n.referenceNumber)).toContain(`Z-${suffix}`);
    expect((await catalogue.getOne(productId, true))?.compliance.status).toBe("BLOCKED");
    expect((await catalogue.getHistory(productId, true, asUser(orgA, userA, true))).some((h) => h.fieldName === "safety notice added")).toBe(true);
    const notes = await withTenantContext(orgB, (tx) => tx.notification.findMany({ where: { recipientUserId: userB, kind: "SAFETY_NOTICE", subjectId: created.id } }));
    expect(notes).toHaveLength(1);
    expect(notes[0].requiresAction).toBe(true);
    // Not notified: the actor's own organisation has no use of the product, and nothing leaks across tenants.
    const notesA = await withTenantContext(orgA, (tx) => tx.notification.findMany({ where: { kind: "SAFETY_NOTICE", subjectId: created.id } }));
    expect(notesA).toHaveLength(0);
  });

  it("flags the product for an organisation until it records its own review; review is private", async () => {
    const [n] = await safety.list(asUser(orgB, userB), productTarget(productId));
    const before = await safety.flags(asUser(orgB, userB), [productId, siblingId]);
    expect(before).toHaveLength(1);
    expect(before[0]).toMatchObject({ productMasterId: productId, openNotices: 1, criticalOpen: 1, unreviewed: 1 });
    await expect(safety.review(asUser(orgB, userB, false, ["projects.edit"]), n.id, { outcome: "CHECKED_NO_IMPACT" })).rejects.toThrow();
    await expect(safety.review(asUser(orgB, userB), n.id, { outcome: "AFFECTED" })).rejects.toThrow(/note/i);
    await safety.review(asUser(orgB, userB), n.id, { outcome: "ACTION_TAKEN", notes: "Quarantined stock and informed the supplier." });
    expect((await safety.flags(asUser(orgB, userB), [productId]))[0].unreviewed).toBe(0);
    // Recording the review completes the organisation's to-do for this notice.
    const todo = await withTenantContext(orgB, (tx) => tx.notification.findMany({ where: { kind: "SAFETY_NOTICE", subjectId: n.id } }));
    expect(todo.every((t) => t.actionStatus === "DONE")).toBe(true);
    expect((await safety.list(asUser(orgB, userB), productTarget(productId)))[0].myReview?.outcome).toBe("ACTION_TAKEN");
    // Organisation A has not reviewed it: its view is unaffected by B's review.
    expect((await safety.list(asUser(orgA, userA), productTarget(productId)))[0].myReview).toBeNull();
    const dash = await safety.dashboard(asUser(orgB, userB));
    expect(dash.mine.actionTaken).toBeGreaterThanOrEqual(1);
    expect(dash.mine.onMyProjectLines).toBe(0); // approved source only, no project line
  });

  it("a family-level notice applies to every variant and to the family compliance", async () => {
    const fam = await safety.create(asUser(orgA, userA, true), familyTarget(familyId), { noticeType: "SAFETY_ALERT", severity: "MEDIUM", authority: "MHRA", title: `Family advisory ${suffix}`, summary: "Check storage labels.", issueDate: "2026-10-05" });
    expect(fam.productFamilyId).toBe(familyId);
    const onSibling = await safety.list(asUser(orgA, userA), productTarget(siblingId));
    expect(onSibling.map((n) => n.title)).toContain(`Family advisory ${suffix}`);
    expect(onSibling.find((n) => n.title === `Family advisory ${suffix}`)?.inherited).toBe(true);
    expect((await catalogue.getOne(siblingId, true))?.compliance.reasons.join(" ")).toMatch(/safety notice/i);
    const onFamily = await safety.list(asUser(orgA, userA), familyTarget(familyId));
    expect(onFamily.length).toBeGreaterThanOrEqual(2); // family notice plus the variant's recall
  });

  it("closing needs a reason, unblocks the product, and nothing is deleted", async () => {
    const [recall] = (await safety.list(asUser(orgA, userA), productTarget(productId))).filter((n) => n.noticeType === "RECALL");
    await expect(safety.update(asUser(orgB, userB), recall.id, { status: "CLOSED", closedReason: "x" })).rejects.toThrow();
    await expect(safety.update(asUser(orgA, userA), recall.id, { status: "CLOSED" })).rejects.toThrow(/reason/i);
    const closed = await safety.update(asUser(orgA, userA), recall.id, { status: "CLOSED", closedReason: "Corrective action completed; lots reconciled." });
    expect(closed.status).toBe("CLOSED");
    expect(closed.closedDate).not.toBeNull();
    expect((await catalogue.getOne(productId, true))?.compliance.status).not.toBe("BLOCKED");
    const all = await safety.list(asUser(orgA, userA), productTarget(productId), true);
    expect(all.some((n) => n.id === recall.id)).toBe(true);
    expect((await safety.flags(asUser(orgB, userB), [productId])).find((f) => f.criticalOpen > 0)).toBeUndefined();
  });
});
