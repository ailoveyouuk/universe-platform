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
