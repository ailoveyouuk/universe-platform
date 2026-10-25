import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Lewis's rule (2026-10-25): the anonymised price pool and everything in the Insights app carries COST prices only, the price a supplier or
 * manufacturer charged before any margin, for goods, freight and services alike. This test fails if any code that feeds or serves Insights
 * (the aggregation pipeline, its queries, and the Insights API) names a field that holds a margin-bearing figure. Comments are ignored.
 */
const ROOT = resolve(__dirname, "../../..");
const FOLDERS = ["packages/insights-db/src", "packages/insights-db/scripts", "apps/api/src/insights"];
const FORBIDDEN = [
  "unitSalesPrice", "salesTotalPrice", "salesUnitPrice", "salesPriceLockedAt", "clientPaymentAmount", "clientPaymentCurrency", "grossMargin", "productMargin",
  "freightMargin", "freightInvoice", "invoiceAmount", "marginPercent", "marginAmount",
];

const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith(".ts") ? [join(dir, e.name)] : []));

describe("Insights is fed cost prices only", () => {
  it("no code that feeds or serves Insights reads a margin-bearing price field", () => {
    const hits: string[] = [];
    for (const f of FOLDERS) for (const file of files(join(ROOT, f))) {
      const code = strip(readFileSync(file, "utf8"));
      for (const word of FORBIDDEN) if (code.includes(word)) hits.push(`${file.replace(ROOT, "")}: ${word}`);
    }
    expect(hits).toEqual([]);
  });
  it("no table in the insights database has a margin, sales, invoice or client money column", () => {
    const schema = readFileSync(join(ROOT, "packages/insights-db/prisma/schema.prisma"), "utf8");
    const fields = strip(schema).split("\n").map((l) => l.trim().split(/\s+/)[0] ?? "").filter((w) => /^[a-z]/.test(w));
    const bad = fields.filter((f) => /margin|sales|invoice|client|markup/i.test(f));
    expect(bad).toEqual([]);
  });
  it("the pipeline reads the pre-margin supplier price", () => {
    const etl = strip(readFileSync(join(ROOT, "packages/insights-db/src/aggregate-etl.ts"), "utf8"));
    expect(etl).toContain("supplierUnitPrice");
    expect(etl).toContain("supplierPaymentCurrency");
    expect(etl).not.toContain("productPriceHistory");
  });
});

describe("Insights freight and service pools are cost only (2026-10-25)", () => {
  const etl = readFileSync(join(__dirname, "../../../packages/insights-db/src/aggregate-etl.ts"), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  it("freight reads the core freight price, never the margin or the client invoice", () => {
    expect(etl).toContain("freightCost");
    expect(etl).not.toMatch(/freightMargin|freightInvoice|freightTotalCostReportingCcy|freightInsuranceCost/);
  });
  it("services read the supplier price of Services lines only", () => {
    expect(etl).toMatch(/productCategory: "SERVICES"/);
    expect(etl).toContain("supplierUnitPrice");
    expect(etl).not.toMatch(/unitSalesPrice|clientPaymentAmount|productMargin/);
  });
});
