import { describe, expect, it } from "vitest";
import { buildOcdsPackage, type OcdsInput } from "../src/tenders/ocds";

const base = (over: Partial<OcdsInput> = {}, t: Partial<OcdsInput["tender"]> = {}): OcdsInput => ({
  tender: { id: "t1", organizationId: "buyer", referenceNumber: "TND-2026-0009", title: "Antimalarials", summary: "Supply", tenderType: "RFQ", visibility: "ELIGIBLE_ORGANISATIONS", status: "PUBLISHED", currency: "USD",
    publishedAt: new Date("2026-01-01"), clarificationDeadline: null, closingAt: new Date("2026-02-01"), awardDueAt: null, contractStartDate: null, bidsOpenedAt: null, awardedAt: null,
    cancelledReason: null, emergencyProcurement: false, emergencyReason: null, frameworkTermMonths: null, frameworkCeiling: null, frameworkCallOffMethod: null, deliveryCountryCodes: "KE", ...t },
  buyer: { id: "buyer", name: "Buyer Org" },
  lines: [{ id: "l1", lineNumber: 1, lotNumber: 1, lotTitle: "Tablets", description: "Artemether", quantity: 1000, unit: "pack", destinationCountryCode: "KE" }],
  countryNames: { KE: "Kenya" }, submittedBids: [{ organizationId: "s1" }, { organizationId: "s2" }], orgNames: { s1: "Supplier One", s2: "Supplier Two" },
  awards: [], contracts: [], now: new Date("2026-03-01T10:00:00Z"), ...over,
});

describe("OCDS release package", () => {
  it("is a valid-shaped package with a release, ocid, buyer and items", () => {
    const p = buildOcdsPackage(base());
    expect(p.version).toBe("1.1");
    // required by the official release package schema 1.1.5: uri, publisher (with name), publishedDate, releases, version; release: ocid, id, date, tag, initiationType
    for (const k of ["uri", "publisher", "publishedDate", "releases", "version"]) expect(p).toHaveProperty(k);
    expect(p.publisher.name).toBeTruthy();
    for (const k of ["ocid", "id", "date", "tag", "initiationType"]) expect(p.releases[0]).toHaveProperty(k);
    expect(p.extensions).toEqual(["https://raw.githubusercontent.com/open-contracting-extensions/ocds_lots_extension/master/extension.json"]);
    const r = p.releases[0] as Record<string, any>;
    expect(r.ocid).toBe("ocds-universe-t1");
    expect(r.tag).toEqual(["tender"]);
    expect(r.initiationType).toBe("tender");
    expect(r.buyer).toEqual({ id: "UNIVERSE-buyer", name: "Buyer Org" });
    expect(r.tender.status).toBe("active");
    expect(r.tender.items[0]).toMatchObject({ id: "1", quantity: 1000, unit: { name: "pack" }, relatedLot: "1", deliveryAddress: { countryName: "Kenya" } });
    expect(r.tender.lots).toEqual([{ id: "1", title: "Tablets", status: "active" }]);
    expect(r.tender.tenderPeriod.endDate).toBe("2026-02-01T00:00:00.000Z");
  });

  it("keeps bidders out until the bids are opened (sealed)", () => {
    const sealed = buildOcdsPackage(base()).releases[0] as Record<string, any>;
    expect(sealed.tender.tenderers).toBeUndefined();
    expect(sealed.tender.numberOfTenderers).toBeUndefined();
    expect(sealed.parties.map((x: any) => x.id)).toEqual(["UNIVERSE-buyer"]);
    const opened = buildOcdsPackage(base({}, { bidsOpenedAt: new Date("2026-02-02") })).releases[0] as Record<string, any>;
    expect(opened.tender.numberOfTenderers).toBe(2);
    expect(opened.tender.tenderers.map((x: any) => x.name)).toEqual(["Supplier One", "Supplier Two"]);
    expect(opened.parties.find((x: any) => x.id === "UNIVERSE-s1").roles).toEqual(["tenderer"]);
  });

  it("maps award, contract, milestones and accepted variations, and leaves internal reasoning out", () => {
    const p = buildOcdsPackage(base({
      awards: [{ id: "a1", awardedOrganizationId: "s1", awardedAt: new Date("2026-02-20"), valueAmount: 5000, currency: "USD" }],
      contracts: [{ id: "c1", awardId: "a1", reference: "CON-1", title: "Contract", status: "ACTIVE", currency: "USD", totalValue: 5000, startDate: new Date("2026-03-01"), endDate: new Date("2027-03-01"), executedAt: new Date("2026-02-28"),
        milestones: [{ id: "m1", title: "Delivery", dueDate: new Date("2026-06-01"), status: "DONE", completedAt: new Date("2026-05-30"), notes: null }],
        variations: [{ id: "v1", number: 1, title: "Extend", reason: "Demand", termsAmendment: "Four shipments", appliedAt: new Date("2026-04-01"), status: "ACCEPTED" }, { id: "v2", number: 2, title: "Rejected one", reason: "x", termsAmendment: null, appliedAt: null, status: "REJECTED" }] }],
    }, { bidsOpenedAt: new Date("2026-02-02"), awardedAt: new Date("2026-02-20"), status: "CONTRACTED" }));
    const r = p.releases[0] as Record<string, any>;
    expect(r.tag).toEqual(["tender", "award", "contract", "implementation"]);
    expect(r.tender.status).toBe("complete");
    expect(r.awards[0]).toMatchObject({ id: "a1", status: "active", value: { amount: 5000, currency: "USD" }, suppliers: [{ id: "UNIVERSE-s1", name: "Supplier One" }] });
    expect(r.contracts[0]).toMatchObject({ awardID: "a1", status: "active", dateSigned: "2026-02-28T00:00:00.000Z" });
    expect(r.contracts[0].amendments).toHaveLength(1);
    expect(r.contracts[0].amendments[0]).toMatchObject({ id: "1", rationale: "Demand", description: "Extend: Four shipments" });
    expect(r.contracts[0].implementation.milestones[0]).toMatchObject({ status: "met", dateMet: "2026-05-30T00:00:00.000Z" });
    expect(JSON.stringify(p)).not.toMatch(/score|evaluator|awardReason/i);
  });

  it("marks framework, emergency and cancelled tenders correctly", () => {
    const fw = buildOcdsPackage(base({}, { tenderType: "FRAMEWORK", frameworkCallOffMethod: "ROTATION", frameworkTermMonths: 24, frameworkCeiling: 100000 })).releases[0] as Record<string, any>;
    expect(fw.tender.techniques.hasFrameworkAgreement).toBe(true);
    expect(fw.tender.value).toEqual({ amount: 100000, currency: "USD" });
    const em = buildOcdsPackage(base({}, { emergencyProcurement: true, emergencyReason: "Outbreak", visibility: "INVITED_ONLY" })).releases[0] as Record<string, any>;
    expect(em.tender.procurementMethod).toBe("limited");
    expect(em.tender.procurementMethodRationale).toBe("Outbreak");
    expect((buildOcdsPackage(base({}, { visibility: "INVITED_ONLY" })).releases[0] as any).tender.procurementMethod).toBe("selective");
    const cx = buildOcdsPackage(base({}, { status: "CANCELLED" })).releases[0] as Record<string, any>;
    expect(cx.tender.status).toBe("cancelled");
    expect(cx.tag).toContain("tenderCancellation");
  });
});
