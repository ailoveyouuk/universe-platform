import { describe, expect, it } from "vitest";
import { computePricingMovement, type MovementInputRow } from "../../../packages/insights-db/src/movement";

const hashes = ["a", "b", "c", "d", "e", "f"];
/** Three items (lanes) bought by six organisations in each month; prices follow `factor(month)`. */
function rows(months: number[], factor: (m: number) => number, orgs = hashes): MovementInputRow[] {
  const out: MovementInputRow[] = [];
  for (const m of months) for (const lane of ["AFRO", "SEARO", "EMRO"]) for (const h of orgs) out.push({ category: "Diagnostics", attributes: null, manufactureRegion: "SEARO", destinationRegion: lane, currency: "USD", effectiveMonth: new Date(Date.UTC(2026, m, 1)), sourceHash: h, priceSum: 10 * factor(m), priceCount: 1 });
  return out;
}

describe("computePricingMovement", () => {
  it("chains like-for-like changes into an index starting at 100", () => {
    const s = computePricingMovement(rows([0, 1, 2], (m) => 1 + m * 0.1)).find((x) => x.segmentBy === null)!;
    expect(s.points.map((p) => p.index)[0]).toBe(100);
    expect(s.points[1].index).toBeCloseTo(110, 0);
    expect(s.points[2].index).toBeGreaterThan(s.points[1].index);
  });
  it("shows nothing when fewer than five organisations are behind a month", () => {
    expect(computePricingMovement(rows([0, 1, 2], () => 1, hashes.slice(0, 4)))).toEqual([]);
  });
  it("leaves out a month with fewer than three matching items", () => {
    const r = rows([0, 1], () => 1).filter((x) => x.effectiveMonth.getUTCMonth() === 0 || x.destinationRegion === "AFRO");
    expect(computePricingMovement(r).filter((x) => x.segmentBy === null)).toEqual([]);
  });
  it("returns only ratios, never a price or an organisation", () => {
    const json = JSON.stringify(computePricingMovement(rows([0, 1], (m) => 1 + m)));
    expect(json).not.toMatch(/sourceHash|priceSum|unitPrice/);
  });
});
