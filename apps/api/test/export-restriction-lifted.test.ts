import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, notifyRestrictionLifted, prisma, withPlatformStaffContext, withTenantContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** Lifting an export restriction tells the leads of open projects holding the product (2026-10-19). */
describe("Export restriction lifted notification", () => {
  const suffix = randomUUID().slice(0, 8);
  const name = `Zolpidemlift${suffix}`;
  let org: string; let lead: string; let other: string; let closedProject: string; let openProject: string;

  beforeAll(async () => {
    org = (await createOrganizationWithDefaultRoles({ name: `Lift ${suffix}`, slug: `lift-${suffix}` })).id;
    let product = "";
    await withPlatformStaffContext(async (tx) => {
      lead = (await tx.user.create({ data: { organizationId: org, email: `lead-${suffix}@example.com`, forename: "Lead", surname: "One", status: "ACTIVE" } })).id;
      other = (await tx.user.create({ data: { organizationId: org, email: `oth-${suffix}@example.com`, forename: "Other", surname: "Two", status: "ACTIVE" } })).id;
      product = (await tx.productMaster.create({ data: { name, inn: name.toLowerCase(), category: "Pharmaceuticals", sourceStandard: "TEST", addedByOrganizationId: org, dosageForm: "Tablet", strength: "10 mg" } })).id;
    });
    await withTenantContext(org, async (tx) => {
      const mk = async (ref: string, status: string) => {
        const p = await tx.project.create({ data: { organizationId: org, referenceNumber: `${ref}-${suffix}`, title: ref, category: "PROCUREMENT", projectType: "PHARMACEUTICAL", status } });
        await tx.projectLine.create({ data: { organizationId: org, projectId: p.id, clientProductDescription: name, productMasterId: product } });
        return p.id;
      };
      openProject = await mk("OPEN", "IN_PROGRESS");
      closedProject = await mk("DONE", "COMPLETED");
      await tx.projectLead.create({ data: { projectId: openProject, userId: lead } });
      await tx.projectLead.create({ data: { projectId: closedProject, userId: lead } });
    });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("notifies leads of open projects only, once per restriction and project", async () => {
    const r = { id: randomUUID(), restrictingCountryCode: "GB", medicineName: name, strength: "All", form: "All" };
    const first = await notifyRestrictionLifted(r);
    expect(first.notifications).toBe(1);
    const again = await notifyRestrictionLifted(r);
    expect(again.notifications).toBe(0);
    const rows = await withTenantContext(org, (tx) => tx.notification.findMany({ where: { kind: "EXPORT_RESTRICTION_LIFTED" } }));
    expect(rows).toHaveLength(1);
    expect(rows[0].recipientUserId).toBe(lead);
    expect(rows[0].link).toContain(openProject);
    expect(rows.some((n) => n.recipientUserId === other)).toBe(false);
  });
});
