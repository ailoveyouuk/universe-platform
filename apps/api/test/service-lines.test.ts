import { describe, expect, it } from "vitest";
import { SERVICE_CATALOGUE, serviceCatalogueProblems } from "@universe/types";
import { scopeSubForServiceCategory } from "@universe/types";
import { serviceCategoryPath, serviceLineProblem, serviceScopeSub } from "../src/tenders/service-lines";

describe("service catalogue", () => {
  it("has no repeated codes, unknown categories or bases a category does not use, and covers every category", () => {
    expect(serviceCatalogueProblems()).toEqual([]);
    expect(SERVICE_CATALOGUE.length).toBeGreaterThan(50);
  });
});

describe("service tender lines", () => {
  it("accepts a goods line and a complete service line", () => {
    expect(serviceLineProblem({ description: "x", productMasterId: "p1" }, "Item 1")).toBeNull();
    expect(serviceLineProblem({ serviceCategory: "TRAINING", servicePricingBasis: "PER_DAY", serviceCode: "SVC-TRN-COURSE" }, "Item 1")).toBeNull();
    expect(serviceLineProblem({ serviceCategory: "TRAINING", servicePricingBasis: "PER_DAY" }, "Item 1")).toBeNull();
  });
  it("rejects a service with no pricing basis, a product and a service together, or a catalogue service of another kind", () => {
    expect(serviceLineProblem({ serviceCategory: "TRAINING" }, "Item 2")).toMatch(/price is stated/);
    expect(serviceLineProblem({ serviceCategory: "TRAINING", servicePricingBasis: "PER_DAY", productMasterId: "p1" }, "Item 2")).toMatch(/not both/);
    expect(serviceLineProblem({ serviceCategory: "ADVISORY", servicePricingBasis: "PER_DAY", serviceCode: "SVC-TRN-COURSE" }, "Item 2")).toMatch(/does not belong/);
    expect(serviceLineProblem({ serviceCategory: "TRAINING", servicePricingBasis: "PER_DAY", serviceCode: "NOPE" }, "Item 2")).toMatch(/not in the catalogue/);
    expect(serviceLineProblem({ servicePricingBasis: "PER_DAY" }, "Item 2")).toMatch(/kind of service/);
  });
  it("places a service line under the Services scope for matching", () => {
    expect(serviceCategoryPath("TRAINING")).toBe("Services.Consultancy and advisory");
    expect(serviceScopeSub("TRAINING")).toBe(scopeSubForServiceCategory("TRAINING"));
    expect(serviceScopeSub("TRAINING")).toMatch(/^svc-/);
  });
});

import ExcelJS from "exceljs";
import { buildFinancialTemplate } from "../src/tenders/bid-template";
describe("bid template for service lines", () => {
  it("shows one unit of the pricing basis and explains it", async () => {
    const buf = await buildFinancialTemplate(
      { id: "t1", referenceNumber: "R", title: "T", issuerName: "I", currency: "USD", bidValidityDays: 90, closingText: "soon" },
      [{ id: "l1", lineNumber: 1, description: "Adviser", quantity: "120", unit: "day", servicePricingBasis: "PER_DAY" }, { id: "l2", lineNumber: 2, description: "Study", quantity: "1", unit: "fixed fee", servicePricingBasis: "LUMP_SUM" }, { id: "l3", lineNumber: 3, description: "Pack", quantity: "5", unit: "pack" }],
      [], [{ code: "KE", name: "Kenya" }]);
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf as never);
    const ws = wb.getWorksheet("Financial offer")!;
    expect(ws.getCell("E8").value).toBe("per day");
    expect(ws.getCell("E9").value).toBe("fixed fee");
    expect(ws.getCell("E10").value).toBe("pack");
    expect(String(ws.getCell("B6").value)).toMatch(/one unit of the Unit column/);
  });
});

import { checkBid } from "../src/tenders/bid-completeness";
describe("bid completeness for service lines", () => {
  const base = { allowTextSubmission: true, bidValidityDays: 90, bidCurrency: "USD", validityConfirmed: true, criteria: [], addenda: [] };
  it("does not ask a service for a country of origin, but still asks for a lead time", () => {
    const ok = checkBid({ ...base, lines: [{ noBid: false, unitPrice: 400, leadTimeDays: 14, countryOfOrigin: null, isService: true }] });
    expect(ok.every((c) => c.ok)).toBe(true);
    const missing = checkBid({ ...base, lines: [{ noBid: false, unitPrice: 400, leadTimeDays: null, countryOfOrigin: null, isService: true }] });
    expect(missing.find((c) => !c.ok)?.label).toBe("Give a lead time for each priced item (1 missing)");
  });
  it("still asks goods for a country of origin", () => {
    const r = checkBid({ ...base, lines: [{ noBid: false, unitPrice: 4, leadTimeDays: 10, countryOfOrigin: null }] });
    expect(r.find((c) => !c.ok)?.label).toMatch(/country of origin/);
  });
});

import { catalogueEntryProblem } from "../src/service-catalogue/service-catalogue.service";
describe("catalogue entry validation", () => {
  const ok = { code: "SVC-TA-NEW", category: "TECHNICAL_ASSISTANCE", name: "New", basis: "PER_DAY", unit: "day", description: "A service." };
  it("accepts a good entry", () => expect(catalogueEntryProblem(ok)).toBeNull());
  it("rejects a bad code, unknown category and a basis the category does not use", () => {
    expect(catalogueEntryProblem({ ...ok, code: "abc" })).toMatch(/code/);
    expect(catalogueEntryProblem({ ...ok, category: "NOPE" })).toMatch(/kind of service/);
    expect(catalogueEntryProblem({ ...ok, basis: "PERCENT_OF_GOODS" })).toMatch(/priced/);
  });
});
