import { describe, expect, it } from "vitest";
import { checkBid } from "../src/tenders/bid-completeness";

const base = { allowTextSubmission: true, bidValidityDays: 90, bidCurrency: "USD", validityConfirmed: true, criteria: [], addenda: [] };
const line = (lotNumber: number | null, noBid: boolean) => ({ lotNumber, noBid, unitPrice: noBid ? null : 5, leadTimeDays: noBid ? null : 10, countryOfOrigin: noBid ? null : "IN" });

describe("bid completeness with lots", () => {
  it("accepts a bid on one lot with the other lot not bid", () => {
    const r = checkBid({ ...base, lines: [line(1, false), line(1, false), line(2, true), line(2, true)] });
    expect(r.every((x) => x.ok)).toBe(true);
  });
  it("rejects a lot that is only partly priced", () => {
    const r = checkBid({ ...base, lines: [line(1, false), line(1, true), line(2, false)] });
    expect(r.find((x) => x.label.includes("bid in full"))?.ok).toBe(false);
  });
  it("adds no lot check when there are no lots", () => {
    const r = checkBid({ ...base, lines: [line(null, false), line(null, true)] });
    expect(r.some((x) => x.label.includes("lot"))).toBe(false);
  });
});

import ExcelJS from "exceljs";
import { buildFinancialTemplate } from "../src/tenders/bid-template";

describe("financial template with lots", () => {
  it("shows each item's lot in the last column and the lot instruction", async () => {
    const t = { id: "t1", referenceNumber: "R-1", title: "T", issuerName: "I", closingText: "soon", currency: "USD", bidValidityDays: 90 } as Parameters<typeof buildFinancialTemplate>[0];
    const lines = [{ id: "a", lineNumber: 1, description: "A", quantity: "1", unit: "box", lotNumber: 1, lotTitle: "Medicines" }, { id: "b", lineNumber: 2, description: "B", quantity: "1", unit: "box", lotNumber: 2, lotTitle: "Supplies" }];
    const buf = await buildFinancialTemplate(t, lines, [], []);
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("Financial offer")!;
    const rows = ws.getRows(1, 20)!.map((r) => r.getCell(13).value);
    expect(rows).toContain("Lot 1 · Medicines"); expect(rows).toContain("Lot 2 · Supplies");
    expect(String(ws.getCell("B6").value)).toContain("Bid for a lot in full");
  });
});
