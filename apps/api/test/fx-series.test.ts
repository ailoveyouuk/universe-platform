import { describe, expect, it } from "vitest";
import { buildSeries, crossRate, needsFetch } from "../src/exchange-rates/fx-series";

describe("fx series", () => {
  const days = [
    { date: "2026-03-02", rates: { EUR: 0.9, GBP: 0.8 } },
    { date: "2026-03-03", rates: { EUR: 0.92, GBP: 0.8 } },
  ];
  it("works out cross rates through USD", () => {
    expect(crossRate({ EUR: 0.9, GBP: 0.8 }, "USD", "EUR")).toBeCloseTo(0.9);
    expect(crossRate({ EUR: 0.9, GBP: 0.8 }, "EUR", "USD")).toBeCloseTo(1 / 0.9);
    expect(crossRate({ EUR: 0.9, GBP: 0.8 }, "GBP", "EUR")).toBeCloseTo(0.9 / 0.8);
    expect(crossRate({ EUR: 0.9 }, "GBP", "EUR")).toBeNull();
  });
  it("builds an oldest-first series and skips days without both rates", () => {
    const s = buildSeries([...days, { date: "2026-03-04", rates: { EUR: 0.93 } }].reverse(), "GBP", "EUR");
    expect(s.map((p) => p.date)).toEqual(["2026-03-02", "2026-03-03"]);
    expect(s[1]!.rate).toBeCloseTo(0.92 / 0.8, 5);
  });
  it("asks for a fetch when stored days are missing at the ends or sparse", () => {
    expect(needsFetch([], "2026-01-01", "2026-01-31")).toBe(true);
    const full = Array.from({ length: 22 }, (_, i) => `2026-01-${String(i + 1 + (i > 4 ? 4 : 0)).padStart(2, "0")}`);
    expect(needsFetch(["2026-01-15"], "2026-01-01", "2026-01-31")).toBe(true);
    expect(needsFetch(full.concat(["2026-01-30"]), "2026-01-02", "2026-01-31")).toBe(false);
  });
});
