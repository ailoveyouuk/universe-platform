import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext, withTenantContext, parseCsv, parseUkRestrictionCsv, matchRestriction, appliesToRoute, syncUkExportRestrictions, fetchUkRestrictions, type FetchLike } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ExportRestrictionsService } from "../src/product-catalog/export-restrictions.service";

/** Export and hoarding restrictions: UK CSV parsing, product matching, route logic, history, manual entries (2026-10-18). */
const CSV = [
  "Name,Strength,Pharmaceutical form,Date of restriction",
  "Aspirin,All,All,17/01/2026 00:00",
  `"Hydrocortisone",All,Powder for solution for injection,23/03/2020 00:00`,
  "Cyclophosphamide,1g/2g/500mg,Powder for solution for injection vials,03/07/2026 00:00",
  `"Hyoscine hydrobromide","1.5mg",Patches,10/10/2023 00:00`,
].join("\r\n");

describe("Export restrictions", () => {
  const suffix = randomUUID().slice(0, 8);
  const svc = new ExportRestrictionsService();
  let org: string;
  let userId: string;
  let projectId: string;
  let lineProduct: string;

  const asUser = (staff: boolean): RequestUser => ({
    id: userId, organizationId: org, homeOrganizationId: org, email: `er-${suffix}@example.com`, forename: "Export", surname: "Tester", organizationName: "Export Org",
    organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null, organizationWelcomeMessage: null,
    platformStaffRole: staff ? "SUPER_ADMIN" : "NONE", permissions: ["projects.edit"],
  });

  beforeAll(async () => {
    for (const [code, name] of [["GB", "United Kingdom"], ["KE", "Kenya"]]) await prisma.country.upsert({ where: { code }, update: {}, create: { code, name } });
    org = (await createOrganizationWithDefaultRoles({ name: `Er ${suffix}`, slug: `er-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      userId = (await tx.user.create({ data: { organizationId: org, email: `er-${suffix}@example.com`, forename: "Export", surname: "Tester", status: "ACTIVE" } })).id;
      lineProduct = (await tx.productMaster.create({ data: { name: `Hydrocortisone sodium succinate ${suffix}`, inn: "hydrocortisone", category: "Pharmaceuticals", sourceStandard: "TEST", addedByOrganizationId: org, dosageForm: "Powder for solution for injection", strength: "100 mg" } })).id;
    });
    await withTenantContext(org, async (tx) => {
      const uk = await tx.partner.create({ data: { organizationId: org, name: `UK Wholesaler ${suffix}`, normalizedName: `uk wholesaler ${suffix}`, countryCode: "GB" } });
      const project = await tx.project.create({ data: { organizationId: org, referenceNumber: `ER-${suffix}`, title: "Export check", category: "PROCUREMENT", projectType: "PHARMACEUTICAL", status: "IN_PROGRESS", deliveryCountryCode: "KE" } });
      projectId = project.id;
      await tx.projectLine.create({ data: { organizationId: org, projectId, clientProductDescription: "Hydrocortisone injection", productMasterId: lineProduct, supplierId: uk.id } });
    });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("parses the DHSC CSV including quotes, CRLF and dd/mm/yyyy dates, and rejects unexpected files", () => {
    expect(parseCsv('a,"b,c",d\r\n1,2,3').slice(0, 2)).toEqual([["a", "b,c", "d"], ["1", "2", "3"]]);
    const items = parseUkRestrictionCsv(CSV);
    expect(items).toHaveLength(4);
    expect(items[0]).toMatchObject({ medicineName: "Aspirin", strength: "All", form: "All", restrictingCountryCode: "GB" });
    expect(items[2].restrictionDate?.toISOString().slice(0, 10)).toBe("2026-07-03");
    expect(() => parseUkRestrictionCsv("Foo,Bar\n1,2")).toThrow(/header/i);
    expect(() => parseUkRestrictionCsv("Name,Strength,Pharmaceutical form,Date of restriction")).toThrow();
  });

  it("matches by generic name, strength and form; asks for a check when the product record lacks them", () => {
    const hc = { medicineName: "Hydrocortisone", strength: "All", form: "Powder for solution for injection" };
    expect(matchRestriction({ name: "Hydrocortisone sodium succinate", inn: "hydrocortisone", strength: "100 mg", dosageForm: "Powder for solution for injection" }, hc)?.certainty).toBe("MATCH");
    expect(matchRestriction({ name: "Hydrocortisone cream 1%", inn: "hydrocortisone", strength: "1%", dosageForm: "Cream" }, hc)).toBeNull();
    expect(matchRestriction({ name: "Hydrocortisone", inn: null, strength: null, dosageForm: null }, hc)?.certainty).toBe("CHECK");
    const cy = { medicineName: "Cyclophosphamide", strength: "1g/2g/500mg", form: "Powder for solution for injection vials" };
    expect(matchRestriction({ name: "Cyclophosphamide 500 mg", inn: "cyclophosphamide", strength: "500 mg", dosageForm: "Powder for solution for injection" }, cy)?.certainty).toBe("MATCH");
    expect(matchRestriction({ name: "Cyclophosphamide 50 mg", inn: "cyclophosphamide", strength: "50 mg", dosageForm: "Tablets" }, cy)).toBeNull();
    expect(matchRestriction({ name: "Aspirinase", inn: null, strength: null, dosageForm: null }, { medicineName: "Aspirin", strength: "All", form: "All" })).toBeNull();
  });

  it("route logic: restricted only when goods originate in the restricting country and go elsewhere", () => {
    expect(appliesToRoute("GB", "GB", "KE")).toBe("APPLIES");
    expect(appliesToRoute("GB", "GB", "GB")).toBe("NO");
    expect(appliesToRoute("GB", "IN", "KE")).toBe("NO");
    expect(appliesToRoute("GB", "gb", null)).toBe("DESTINATION_UNKNOWN");
    expect(appliesToRoute("GB", null, "KE")).toBe("NO");
  });

  it("the sync stores the list with history: adds, updates dates, marks removals and never deletes", async () => {
    const make = (csv: string): FetchLike => async (url) => url.includes("/api/content/")
      ? { ok: true, status: 200, json: async () => ({ details: { attachments: [{ url: "https://assets.publishing.service.gov.uk/media/x/list.csv", content_type: "text/csv" }] } }) }
      : { ok: true, status: 200, json: async () => ({}), text: async () => csv };
    const { items } = await fetchUkRestrictions(make(CSV));
    expect(items).toHaveLength(4);
    const before = await prisma.exportRestriction.count({ where: { source: "UK_DHSC_CSV" } });
    const first = await syncUkExportRestrictions({ fetchFn: make(CSV) });
    expect(first.status).toBe("SUCCESS");
    expect(await prisma.exportRestriction.count({ where: { source: "UK_DHSC_CSV", status: "ACTIVE" } })).toBeGreaterThanOrEqual(4);
    const again = await syncUkExportRestrictions({ fetchFn: make(CSV) });
    expect(again.newItems).toBe(0);
    // Drop Aspirin from the list: it is marked REMOVED, not deleted, and comes back as ACTIVE when listed again.
    await syncUkExportRestrictions({ fetchFn: make(CSV.replace("Aspirin,All,All,17/01/2026 00:00\r\n", "")) });
    const aspirin = await prisma.exportRestriction.findFirstOrThrow({ where: { source: "UK_DHSC_CSV", sourceKey: "aspirin|all|all" } });
    expect(aspirin.status).toBe("REMOVED");
    expect(aspirin.removedAt).not.toBeNull();
    await syncUkExportRestrictions({ fetchFn: make(CSV) });
    expect((await prisma.exportRestriction.findFirstOrThrow({ where: { id: aspirin.id } })).status).toBe("ACTIVE");
    expect(await prisma.exportRestriction.count({ where: { source: "UK_DHSC_CSV" } })).toBeGreaterThanOrEqual(before);
    const bad = await syncUkExportRestrictions({ fetchFn: async () => ({ ok: false, status: 503, json: async () => ({}) }) });
    expect(bad).toMatchObject({ status: "FAILED" });
  });

  it("flags a project line sourced from the UK and delivered elsewhere, and not when delivered to the UK", async () => {
    const hits = await svc.checkProject(asUser(false), projectId);
    const hit = hits.find((h) => h.productMasterId === lineProduct && h.restriction.medicineName === "Hydrocortisone");
    expect(hit).toMatchObject({ route: "APPLIES", originCountryCode: "GB", destinationCountryCode: "KE", certainty: "MATCH" });
    await withTenantContext(org, (tx) => tx.project.update({ where: { id: projectId }, data: { deliveryCountryCode: "GB" } }));
    expect((await svc.checkProject(asUser(false), projectId)).filter((h) => h.productMasterId === lineProduct)).toHaveLength(0);
    await withTenantContext(org, (tx) => tx.project.update({ where: { id: projectId }, data: { deliveryCountryCode: null } }));
    expect((await svc.checkProject(asUser(false), projectId)).find((h) => h.productMasterId === lineProduct)?.route).toBe("DESTINATION_UNKNOWN");
    const onProduct = await svc.forProduct(asUser(false), lineProduct);
    expect(onProduct.some((m) => m.restriction.medicineName === "Hydrocortisone")).toBe(true);
  });

  it("other countries are curated by platform staff with a source link, applied by route, and never deleted", async () => {
    await expect(svc.create(asUser(false), { restrictingCountryCode: "KE", medicineName: "Testmedicine", sourceUrl: "https://example.com/notice" })).rejects.toThrow(/platform staff/i);
    const name = `Hydroxytest${suffix}`;
    const created = await svc.create(asUser(true), { restrictingCountryCode: "ke", medicineName: name, sourceUrl: "https://example.com/notice", scope: "EXPORT" });
    expect(created).toMatchObject({ restrictingCountryCode: "KE", source: "MANUAL", status: "ACTIVE" });
    await expect(svc.create(asUser(true), { restrictingCountryCode: "KE", medicineName: name, sourceUrl: "https://example.com/notice" })).rejects.toThrow(/already/i);
    await expect(svc.create(asUser(true), { restrictingCountryCode: "ZZ", medicineName: "Anything", sourceUrl: "https://example.com/notice" })).rejects.toThrow(/country/i);
    const removed = await svc.update(asUser(true), created.id, { status: "REMOVED" });
    expect(removed.status).toBe("REMOVED");
    expect((await svc.list()).some((r) => r.id === created.id)).toBe(false);
    expect((await svc.list(true)).some((r) => r.id === created.id)).toBe(true);
    const uk = await prisma.exportRestriction.findFirstOrThrow({ where: { source: "UK_DHSC_CSV" } });
    await expect(svc.update(asUser(true), uk.id, { status: "REMOVED" })).rejects.toThrow(/daily job/i);
  });
});
