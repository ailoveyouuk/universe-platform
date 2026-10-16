import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ContactsService } from "../src/contacts/contacts.service";
import { ProjectsService } from "../src/projects/projects.service";
import { UsersService } from "../src/users/users.service";

/** Server-side paging for users, projects and contacts (2026-10-17, scale work), against the real RLS database. */
describe("List paging: users, projects, contacts", () => {
  const suffix = randomUUID().slice(0, 8);
  const projects = new ProjectsService({} as never);
  const users = new UsersService();
  const contacts = new ContactsService();
  let orgA: string;
  let orgB: string;

  const asUser = (organizationId: string, permissions: string[], id = randomUUID()): RequestUser => ({
    id,
    organizationId,
    homeOrganizationId: organizationId,
    email: `x-${suffix}@example.com`,
    forename: "T",
    surname: "T",
    organizationName: "x",
    organizationLogoUrl: null,
    organizationLogoIconUrl: null,
    organizationPrimaryColor: null,
    organizationSecondaryColor: null,
    organizationWelcomeMessage: null,
    platformStaffRole: "NONE",
    permissions,
  });

  beforeAll(async () => {
    orgA = (await createOrganizationWithDefaultRoles({ name: `Lp A ${suffix}`, slug: `lp-a-${suffix}` })).id;
    orgB = (await createOrganizationWithDefaultRoles({ name: `Lp B ${suffix}`, slug: `lp-b-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      for (let i = 0; i < 8; i++) {
        await tx.user.create({
          data: { organizationId: orgA, email: `u${i}-${suffix}@lp.example`, forename: `Fore${i}`, surname: `Sur${suffix}`, status: i < 3 ? "ACTIVE" : i < 7 ? "INVITED" : "DEACTIVATED" },
        });
      }
      await tx.user.create({ data: { organizationId: orgB, email: `other-${suffix}@lp.example`, forename: "Other", surname: `Sur${suffix}`, status: "ACTIVE" } });
      const statuses = ["IDENTIFIED", "IN_PROGRESS", "SUBMITTED", "AWARDED", "COMPLETED", "IN_PROGRESS"];
      for (let i = 0; i < statuses.length; i++) {
        await tx.project.create({
          data: {
            organizationId: orgA,
            referenceNumber: `LP-${suffix}-${i}`,
            title: `Paging project ${i}`,
            category: "PROCUREMENT",
            projectType: "PHARMACEUTICAL",
            status: statuses[i],
            // project 5 has no due date; project 0 is long past due
            dueDate: i === 5 ? null : new Date(Date.UTC(2026 + (i === 0 ? -1 : 1), i, 1)),
            isArchived: false,
          },
        });
      }
      await tx.project.create({
        data: { organizationId: orgA, referenceNumber: `LP-${suffix}-arch`, title: "Archived one", category: "PROCUREMENT", projectType: "PHARMACEUTICAL", status: "IN_PROGRESS", isArchived: true },
      });
      const partner = await tx.partner.create({ data: { organizationId: orgA, name: `Contact Co ${suffix}`, normalizedName: `contact co ${suffix}` } });
      for (let i = 0; i < 30; i++) await tx.contact.create({ data: { organizationId: orgA, partnerId: partner.id, name: `Person ${String(i).padStart(2, "0")} ${suffix}` } });
    });
  });

  afterAll(async () => {
    await withPlatformStaffContext(async (tx) => {
      await tx.contact.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.partner.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.project.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.user.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.rolePermission.deleteMany({ where: { role: { organizationId: { in: [orgA, orgB] } } } });
      await tx.role.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
      await tx.dataSharingConsent.deleteMany({ where: { organizationId: { in: [orgA, orgB] } } });
    });
    await prisma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await prisma.$disconnect();
  });

  it("users: pages and searches within the caller's organisation, counts by status", async () => {
    const admin = asUser(orgA, ["org.users.manage"]);
    const r = await users.findPage(admin, { page: 1, pageSize: 5, q: suffix });
    expect(r.total).toBe(8);
    expect(r.items).toHaveLength(5);
    expect((await users.findPage(admin, { page: 2, pageSize: 5, q: suffix })).items).toHaveLength(3);
    expect((await users.findPage(admin, { q: suffix, status: "INVITED" })).total).toBe(4);
    expect(await users.counts(admin)).toEqual({ total: 8, active: 3, invited: 4, archived: 1 });
  });

  it("users: a non-admin sees only themselves in the paged list, but can use the picker for colleagues", async () => {
    const me = asUser(orgA, [], randomUUID());
    expect((await users.findPage(me, { q: suffix })).total).toBe(0);
    const byName = await users.options(me, `Sur${suffix}`);
    expect(byName).toHaveLength(7); // archived excluded, other organisation excluded
    expect(Object.keys(byName[0]).sort()).toEqual(["forename", "id", "surname"]);
  });

  it("projects: filters, status groups, overdue, archived toggle, nulls last, paging", async () => {
    const u = asUser(orgA, ["projects.view"]);
    const all = await projects.findPage(u, { q: `LP-${suffix}`, pageSize: 5, sort: "reference", dir: "asc" });
    expect(all.total).toBe(6); // archived excluded
    expect(all.items).toHaveLength(5);
    expect((await projects.findPage(u, { q: `LP-${suffix}`, archived: true })).total).toBe(7);
    expect((await projects.findPage(u, { q: `LP-${suffix}`, status: "ACTIVE" })).total).toBe(3);
    expect((await projects.findPage(u, { q: `LP-${suffix}`, status: "OVERDUE" })).items.map((p) => p.referenceNumber)).toEqual([`LP-${suffix}-0`]);
    const byDue = await projects.findPage(u, { q: `LP-${suffix}`, pageSize: 5, sort: "due", dir: "asc" });
    expect(byDue.items[0].referenceNumber).toBe(`LP-${suffix}-0`);
    const page2 = await projects.findPage(u, { q: `LP-${suffix}`, page: 2, pageSize: 5, sort: "due", dir: "asc" });
    expect(page2.items.map((p) => p.referenceNumber)).toEqual([`LP-${suffix}-5`]); // no due date sorts last
    const desc = await projects.findPage(u, { q: `LP-${suffix}`, pageSize: 5, sort: "due", dir: "desc" });
    expect(desc.items.at(-1)?.dueDate).not.toBeNull();
    expect((await projects.findPage(asUser(orgB, ["projects.view"]), { q: `LP-${suffix}` })).total).toBe(0);
  });

  it("projects: overview counts exclude archived and cap the recent lists", async () => {
    const o = await projects.overview(asUser(orgA, ["projects.view"]));
    expect(o.counts).toMatchObject({ total: 6, active: 3, submitted: 1, awarded: 1, completed: 1, overdue: 1 });
    expect(o.recentActive.length).toBeLessThanOrEqual(5);
    expect(o.recentAwarded).toHaveLength(1);
  });

  it("contacts: search-driven and bounded", async () => {
    const u = asUser(orgA, []);
    expect(await contacts.findAll(u, suffix, 10)).toHaveLength(10);
    expect(await contacts.findAll(u, `Person 07 ${suffix}`)).toHaveLength(1);
    expect(await contacts.findAll(asUser(orgB, []), suffix)).toHaveLength(0);
    expect((await contacts.findAll(u, suffix, 1000)).length).toBe(30);
  });
});
