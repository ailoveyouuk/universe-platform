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
