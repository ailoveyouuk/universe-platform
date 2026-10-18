import { randomUUID } from "node:crypto";
import { createOrganizationWithDefaultRoles, prisma, withPlatformStaffContext, runRegulatoryWatch, buildProductIndex, matchItem, normaliseIdentifier, fdaSeverity, mhraClassify, CONNECTORS, type Connector, type FetchLike, type WatchItemInput } from "@universe/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { RequestUser } from "../src/auth/entra-auth.guard";
import { ProductCatalogService } from "../src/product-catalog/product-catalog.service";
import { ProductSafetyNoticesService } from "../src/product-catalog/product-safety-notices.service";
import { RegulatoryWatchService } from "../src/product-catalog/regulatory-watch.service";
import { ExportRestrictionsService } from "../src/product-catalog/export-restrictions.service";
import { productTarget } from "../src/product-catalog/product-target";

/** Regulatory watch: connectors, deterministic matching, idempotent runs, advisory triage (2026-10-18). Real database; no live network. */
describe("Regulatory watch", () => {
  const suffix = randomUUID().slice(0, 8);
  const gtin = `9${String(Math.floor(Math.random() * 1e12)).padStart(12, "0")}`; // 13 digits
  const safety = new ProductSafetyNoticesService();
  const watch = new RegulatoryWatchService(safety, new ExportRestrictionsService());
  const catalogue = new ProductCatalogService();
  let org: string;
  let userId: string;
  let productId: string;
  const source = `TEST_${suffix}`;

  const asUser = (staff: boolean): RequestUser => ({
    id: userId, organizationId: org, homeOrganizationId: org, email: `rw-${suffix}@example.com`, forename: "Watch", surname: "Tester",
    organizationName: "Watch Org", organizationLogoUrl: null, organizationLogoIconUrl: null, organizationPrimaryColor: null, organizationSecondaryColor: null,
    organizationWelcomeMessage: null, platformStaffRole: staff ? "SUPER_ADMIN" : "NONE", permissions: ["projects.edit", "products.approve"],
  });

  const item = (over: Partial<WatchItemInput> = {}): WatchItemInput => ({
    source, sourceReference: `Z-${suffix}-1`, authority: "FDA", noticeType: "RECALL", severity: "HIGH", title: `Acme Ltd: Test suture ${suffix}`,
    summary: "Packaging seal failure.", actionRequired: null, affectedText: `Test suture, UDI-DI: (01) 0${gtin} Lot: A1`, firmName: "Acme Ltd",
    countryCodes: null, issueDate: new Date("2026-10-10T00:00:00Z"), status: "OPEN", url: "https://example.com/recall", ...over,
  });
  const fake = (items: () => WatchItemInput[]): Connector => ({ source: source as never, fetchItems: async () => items() });

  beforeAll(async () => {
    org = (await createOrganizationWithDefaultRoles({ name: `Rw ${suffix}`, slug: `rw-${suffix}` })).id;
    await withPlatformStaffContext(async (tx) => {
      userId = (await tx.user.create({ data: { organizationId: org, email: `rw-${suffix}@example.com`, forename: "Watch", surname: "Tester", status: "ACTIVE" } })).id;
      productId = (await tx.productMaster.create({ data: { name: `Test suture ${suffix} 2-0`, category: "Medical Devices", sourceStandard: "TEST", addedByOrganizationId: org, gtin } })).id;
    });
  });
  afterAll(async () => { await prisma.$disconnect(); });

  it("normalises identifiers so GTIN-13/14 and hyphenated NDCs line up", () => {
    expect(normaliseIdentifier("00885914010549")).toBe(normaliseIdentifier("885914010549"));
    expect(normaliseIdentifier("0536-1261-63")).toBe(normaliseIdentifier("00536126163"));
  });

  it("matches on identifiers with high confidence, and on name plus strength with lower confidence; name alone is not enough", () => {
    const idx = buildProductIndex([
      { id: "p1", name: "A", inn: null, brand: null, strength: null, identifiers: ["885914010549"] },
      { id: "p2", name: "B", inn: "amoxicillin", brand: null, strength: "500 mg", identifiers: [] },
      { id: "p3", name: "C", inn: "amoxicillin", brand: null, strength: "250 mg", identifiers: [] },
    ]);
    const byId = matchItem({ title: "x", summary: "", affectedText: "UDI-DI: (01) 00885914010549 Lot 1" }, idx);
    expect(byId).toHaveLength(1);
    expect(byId[0]).toMatchObject({ productMasterId: "p1", matchBasis: "IDENTIFIER", confidence: 0.95 });
    const byName = matchItem({ title: "Amoxicillin 500mg capsules recall", summary: "", affectedText: null }, idx);
    expect(byName.map((m) => m.productMasterId)).toEqual(["p2"]);
    expect(byName[0].matchBasis).toBe("NAME");
    expect(matchItem({ title: "Amoxicillin oral suspension recall", summary: "", affectedText: null }, idx)).toHaveLength(0);
  });

  it("maps severities and notice types from FDA classes and MHRA alert types", () => {
    expect(fdaSeverity("Class I")).toBe("CRITICAL");
    expect(fdaSeverity("Class II")).toBe("HIGH");
    expect(fdaSeverity("Class III")).toBe("MEDIUM");
    expect(mhraClassify(["drug-alert-class-2"], "Class 2 Medicines Recall: X")).toEqual({ noticeType: "RECALL", severity: "HIGH" });
    expect(mhraClassify(["field-safety-notices"], "Field Safety Notices: 1 to 5 January")).toEqual({ noticeType: "FIELD_SAFETY_NOTICE", severity: "LOW" });
  });

  it("the openFDA and MHRA connectors parse real-shaped responses, treat 404 as empty, and refuse unknown hosts", async () => {
    const responses: Record<string, { status: number; body?: unknown }> = {
      "api.fda.gov/device": { status: 200, body: { results: [{ recall_number: "Z-1-2027", classification: "Class I", report_date: "20261007", recalling_firm: "Ethicon, LLC", product_description: "Silk suture", reason_for_recall: "Fluid in pack", code_info: "UDI-DI: 10705031047365", status: "Ongoing", event_id: "9" }] } },
      "api.fda.gov/drug": { status: 404 },
      "www.gov.uk": { status: 200, body: { results: [{ title: "Class 2 Medicines Recall: Foo 5 mg", description: "Batch issue", link: "/drug-device-alerts/foo", public_timestamp: "2026-10-16T10:00:00Z", issued_date: "2026-10-15", alert_type: ["drug-alert-class-2"] }] } },
    };
    const fetchFn: FetchLike = async (url) => {
      const u = new URL(url);
      const key = u.hostname === "api.fda.gov" ? `api.fda.gov/${u.pathname.split("/")[1]}` : u.hostname;
      const r = responses[key];
      return { ok: r.status === 200, status: r.status, json: async () => r.body };
    };
    const since = new Date("2026-09-01T00:00:00Z");
    const [dev, drug, mhra] = await Promise.all(CONNECTORS.map((c) => c.fetchItems(since, fetchFn)));
    expect(dev).toHaveLength(1);
    expect(dev[0]).toMatchObject({ sourceReference: "Z-1-2027", severity: "CRITICAL", authority: "FDA", status: "OPEN" });
    expect(drug).toHaveLength(0);
    expect(mhra[0]).toMatchObject({ sourceReference: "/drug-device-alerts/foo", severity: "HIGH", noticeType: "RECALL", countryCodes: "GB" });
    const { defaultFetch } = await import("@universe/db");
    await expect(defaultFetch("https://evil.example.com/x")).rejects.toThrow(/allow-list/);
  });

  it("a run stores items idempotently, matches real products, logs the run, and re-runs without duplicates", async () => {
    const first = (await runRegulatoryWatch({ connectors: [fake(() => [item()])], sources: [source] }))[0];
    expect(first).toMatchObject({ status: "SUCCESS", fetched: 1, newItems: 1, changedItems: 0 });
    expect(first.newMatches).toBeGreaterThanOrEqual(1);
    const second = (await runRegulatoryWatch({ connectors: [fake(() => [item()])], sources: [source] }))[0];
    expect(second).toMatchObject({ newItems: 0, changedItems: 0, newMatches: 0 });
    const changed = (await runRegulatoryWatch({ connectors: [fake(() => [item({ status: "CLOSED" })])], sources: [source] }))[0];
    expect(changed).toMatchObject({ newItems: 0, changedItems: 1 });
    expect(await prisma.regulatoryWatchItem.count({ where: { source } })).toBe(1);
    expect(await prisma.regulatoryWatchMatch.count({ where: { item: { source }, productMasterId: productId } })).toBe(1);
    expect(await prisma.regulatoryWatchRun.count({ where: { source, status: "SUCCESS" } })).toBe(3);
  });

  it("a failing source is logged as FAILED and does not stop the run", async () => {
    const bad: Connector = { source: `${source}_BAD` as never, fetchItems: async () => { throw new Error("HTTP 503"); } };
    const res = await runRegulatoryWatch({ connectors: [bad, fake(() => [])], sources: [`${source}_BAD`, source] });
    expect(res.find((r) => r.source === `${source}_BAD`)).toMatchObject({ status: "FAILED", error: "HTTP 503" });
    expect(res.find((r) => r.source === source)?.status).toBe("SUCCESS");
    expect((await prisma.regulatoryWatchRun.findFirst({ where: { source: `${source}_BAD` } }))?.status).toBe("FAILED");
  });

  it("matching is advisory: nothing is blocked until platform staff confirm, which records a safety notice", async () => {
    const match = await prisma.regulatoryWatchMatch.findFirstOrThrow({ where: { item: { source }, productMasterId: productId } });
    expect(match.status).toBe("PENDING");
    expect((await catalogue.getOne(productId, true))?.compliance.status).not.toBe("BLOCKED");
    expect((await watch.forProduct(asUser(false), productId)).map((m) => m.id)).toContain(match.id);
    await expect(watch.confirm(asUser(false), match.id)).rejects.toThrow(/platform staff/i);
    const confirmed = await watch.confirm(asUser(true), match.id, "Matches our UDI-DI");
    expect(confirmed.status).toBe("CONFIRMED");
    expect(confirmed.safetyNoticeId).not.toBeNull();
    const notices = await safety.list(asUser(true), productTarget(productId));
    expect(notices.map((n) => n.id)).toContain(confirmed.safetyNoticeId);
    await expect(watch.confirm(asUser(true), match.id)).rejects.toThrow(/already/i);
  });

  it("dismissal needs a reason and keeps the match", async () => {
    await runRegulatoryWatch({ connectors: [fake(() => [item({ sourceReference: `Z-${suffix}-2`, title: `Acme Ltd: second ${suffix}` })])], sources: [source] });
    const match = await prisma.regulatoryWatchMatch.findFirstOrThrow({ where: { item: { source, sourceReference: `Z-${suffix}-2` }, productMasterId: productId } });
    await expect(watch.dismiss(asUser(true), match.id, "  ")).rejects.toThrow(/reason/i);
    const d = await watch.dismiss(asUser(true), match.id, "Different manufacturer");
    expect(d.status).toBe("DISMISSED");
    expect(await prisma.regulatoryWatchMatch.count({ where: { id: match.id } })).toBe(1);
    const dash = await watch.dashboard(asUser(true));
    expect(dash.sources.map((s) => s.source)).toContain("OPENFDA_DEVICE");
    expect(dash.totals.dismissed).toBeGreaterThanOrEqual(1);
  });
});
