import { describe, expect, it } from "vitest";
import type { ScorecardMetric } from "@universe/types";
import { linearScore, pctStatus, pickHeadline, summarise } from "../src/quality/scorecard-scoring";

const m = (key: string, score: number | null, weight: number, status: ScorecardMetric["status"] = "good"): ScorecardMetric =>
  ({ key, group: "DELIVERY", label: key, display: String(score), score, weight, status, detail: "", benchmark: null, href: null });

describe("Partner scorecard scoring", () => {
  it("weights measures and ignores those without data, reporting coverage", () => {
    const s = summarise([m("a", 100, 20), m("b", 50, 20), m("c", null, 60, "neutral")]);
    expect(s.overallScore).toBe(75);
    expect(s.coverage).toBe(40);
    expect(s.band).toBe("SATISFACTORY");
  });
  it("says there is not enough data rather than inventing a score", () => {
    expect(summarise([m("a", null, 20, "neutral")]).band).toBe("NOT_ENOUGH_DATA");
    expect(summarise([m("a", null, 20, "neutral")]).overallScore).toBeNull();
  });
  it("a critical measure holds a strong score at Watch and says why", () => {
    const s = summarise([m("ot", 100, 80), m("serious", 0, 5, "critical")]);
    expect(s.overallScore).toBeGreaterThanOrEqual(85);
    expect(s.band).toBe("WATCH");
    expect(s.bandNote).toMatch(/serious/);
    // The number alone still reads strong; the problem is flagged separately.
    expect(s.scoreBand).toBe("STRONG");
    expect(s.attention).toEqual(["serious"]);
  });
  it("headlines the four that need attention first, then the heaviest", () => {
    const h = pickHeadline([m("w10", 90, 10), m("w20", 90, 20), m("warn", 60, 5, "warning"), m("crit", 0, 3, "critical"), m("w15", 90, 15), m("none", null, 50, "neutral")]);
    expect(h.map((x) => x.key)).toEqual(["crit", "warn", "w20", "w15"]);
  });
  it("converts values to scores in either direction", () => {
    expect(linearScore(0, 0, 10)).toBe(100);
    expect(linearScore(5, 0, 10)).toBe(50);
    expect(linearScore(20, 0, 10)).toBe(0);
    expect(pctStatus(96, 95, 85)).toBe("good");
    expect(pctStatus(90, 95, 85)).toBe("warning");
    expect(pctStatus(70, 95, 85)).toBe("critical");
  });
});

import { onTimeWithin, shiftWorkingDays } from "../src/quality/scorecard-scoring";
describe("On-time window (USAID GHSC-PSM: 30 working days early to 5 late)", () => {
  const due = new Date("2026-03-18T00:00:00Z"); // Wednesday
  it("counts a delivery up to 5 working days late as on time, 6 as late", () => {
    expect(onTimeWithin(new Date("2026-03-25T00:00:00Z"), due, 30, 5)).toBe(true);
    expect(onTimeWithin(new Date("2026-03-26T00:00:00Z"), due, 30, 5)).toBe(false);
  });
  it("counts early deliveries within 30 working days as on time", () => {
    expect(onTimeWithin(new Date("2026-02-04T00:00:00Z"), due, 30, 5)).toBe(true);
    expect(onTimeWithin(new Date("2026-02-01T00:00:00Z"), due, 30, 5)).toBe(false);
  });
  it("skips weekends when shifting", () => {
    expect(shiftWorkingDays(new Date("2026-03-20T00:00:00Z"), 1).toISOString().slice(0, 10)).toBe("2026-03-23");
    expect(shiftWorkingDays(new Date("2026-03-23T00:00:00Z"), -1).toISOString().slice(0, 10)).toBe("2026-03-20");
  });
});
