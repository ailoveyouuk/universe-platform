import { describe, expect, it } from "vitest";
import { SCORECARD_THRESHOLDS } from "@universe/types";
import { evaluateEligibility, type OrgProfile } from "../src/tenders/eligibility";
import { pastPerformanceScore, aggregateRecords, bandFromScore, buildMeasures, feedbackProblem, paymentPractice, parseRatingRule, ratingRuleMet, type AggRow } from "../src/tenders/tender-performance";

const cfg = { onTimeGood: SCORECARD_THRESHOLDS.onTime.good, onTimeWarn: SCORECARD_THRESHOLDS.onTime.warn, inFullGood: SCORECARD_THRESHOLDS.inFull.good, inFullWarn: SCORECARD_THRESHOLDS.inFull.warn, otifGood: SCORECARD_THRESHOLDS.otif.good, otifWarn: SCORECARD_THRESHOLDS.otif.warn };
const fb = { quality: 5, communication: 4, documentation: 4, flexibility: 3, wouldUseAgain: 5 };
const row = (o: string, score: number | null = 90): AggRow => ({ organizationId: o, overallScore: score, milestonesTotal: 4, milestonesOnTime: 3, onTimePercent: 100, inFullPercent: 90 });

describe("performance record measures", () => {
  it("scores with the weighted mean of measures that have data, and says not measured otherwise", () => {
    const r = buildMeasures({ onTimeYes: 9, onTimeFlags: 10, inFullYes: 10, inFullFlags: 10, otifYes: 9, otifN: 10 }, { total: 4, done: 4, onTime: 4, late: 0, missed: 0 }, fb, cfg);
    expect(r.overallScore).not.toBeNull();
    expect(r.measures.find((m) => m.key === "on_time")?.display).toBe("90%");
    const none = buildMeasures(null, { total: 0, done: 0, onTime: 0, late: 0, missed: 0 }, null, cfg);
    expect(none.overallScore).toBeNull();
    expect(none.band).toBe("NOT_ENOUGH_DATA");
    expect(none.measures.find((m) => m.key === "on_time")?.display).toBe("Not measured");
  });
  it("uses the owner's thresholds for status", () => {
    const strict = buildMeasures({ onTimeYes: 9, onTimeFlags: 10, inFullYes: 10, inFullFlags: 10, otifYes: 10, otifN: 10 }, { total: 0, done: 0, onTime: 0, late: 0, missed: 0 }, null, cfg);
    expect(strict.measures.find((m) => m.key === "on_time")?.status).toBe("warning");
    const lenient = buildMeasures({ onTimeYes: 9, onTimeFlags: 10, inFullYes: 10, inFullFlags: 10, otifYes: 10, otifN: 10 }, { total: 0, done: 0, onTime: 0, late: 0, missed: 0 }, null, { ...cfg, onTimeGood: 85 });
    expect(lenient.measures.find((m) => m.key === "on_time")?.status).toBe("good");
  });
  it("requires a reason for a rating of 1 or 2 only", () => {
    expect(feedbackProblem(fb)).toBeNull();
    expect(feedbackProblem({ ...fb, quality: 2 })).toMatch(/Quality of goods/);
    expect(feedbackProblem({ ...fb, quality: 1, reasons: { quality: "Damaged cartons" } })).toBeNull();
  });
});

describe("quality and cold chain measures", () => {
  const none = { total: 0, done: 0, onTime: 0, late: 0, missed: 0 };
  const q = (o: Partial<{ checked: boolean; complaints: number; concluded: number; upheldEq: number; seriousUpheld: number; open: number; logs: number; excursions: number }>) => ({ checked: false, complaints: 0, concluded: 0, upheldEq: 0, seriousUpheld: 0, open: 0, logs: 0, excursions: 0, ...o });
  const get = (r: ReturnType<typeof buildMeasures>, k: string) => r.measures.find((m) => m.key === k)!;
  it("is not measured unless complaints are linked or the owner confirmed there were none", () => {
    expect(get(buildMeasures(null, none, null, cfg, q({})), "quality").display).toBe("Not measured");
    expect(get(buildMeasures(null, none, null, cfg, q({ checked: true })), "quality").score).toBe(100);
    expect(get(buildMeasures(null, none, null, cfg, null), "cold_chain").display).toBe("Not measured");
  });
  it("counts upheld and serious complaints and leaves open ones out", () => {
    const m = get(buildMeasures(null, none, null, cfg, q({ complaints: 3, concluded: 2, upheldEq: 1.5, seriousUpheld: 1, open: 1 })), "quality");
    expect(m.score).toBe(35);
    expect(m.detail).toMatch(/1 still open and not counted/);
  });
  it("scores temperature excursions against linked logs", () => {
    expect(get(buildMeasures(null, none, null, cfg, q({ logs: 10, excursions: 0 })), "cold_chain").status).toBe("good");
    expect(get(buildMeasures(null, none, null, cfg, q({ logs: 10, excursions: 4 })), "cold_chain").status).toBe("critical");
  });
});

describe("past performance criterion score", () => {
  it("uses the average score, and 70 for newcomers", () => {
    expect(pastPerformanceScore(aggregateRecords([row("a", 90), row("b", 80), row("c", 85)]))).toBe(85);
    expect(pastPerformanceScore(aggregateRecords([row("a", 90)]))).toBe(70);
  });
});

describe("anonymised supplier aggregate", () => {
  it("shows nothing below three contracts or from a single owner", () => {
    expect(aggregateRecords([row("a"), row("b")]).sufficient).toBe(false);
    expect(aggregateRecords([row("a"), row("a"), row("a")]).sufficient).toBe(false);
    const thin = aggregateRecords([row("a"), row("b")]);
    expect(thin.band).toBe("INSUFFICIENT_HISTORY");
    expect(thin.contracts).toBeNull();
    expect(thin.averageScore).toBeNull();
  });
  it("shows a band and averages from three contracts and two owners", () => {
    const a = aggregateRecords([row("a", 90), row("a", 88), row("b", 92)]);
    expect(a.sufficient).toBe(true);
    expect(a.band).toBe("STRONG");
    expect(a.contracts).toBe(3);
    expect(a.owners).toBe(2);
    expect(a.milestonesMetPercent).toBe(75);
    expect(bandFromScore(75)).toBe("GOOD");
    expect(bandFromScore(60)).toBe("WATCH");
  });
});

describe("minimum supplier rating rule", () => {
  const profile = (performance: ReturnType<typeof aggregateRecords>): OrgProfile => ({ organizationId: "x", orgType: "SUPPLIER", countries: [], categories: [], qualifications: [], hasProfileEvidence: true, performance });
  const rules = (v: string) => [{ id: "r", ruleType: "MIN_SUPPLIER_RATING", ruleValue: v, isRequired: true }];
  const none = aggregateRecords([]);
  const strong = aggregateRecords([row("a", 90), row("b", 90), row("c", 90)]);
  const watch = aggregateRecords([row("a", 50), row("b", 50), row("c", 50)]);
  it("lets newcomers bid unless the owner chose strict", () => {
    expect(parseRatingRule("GOOD")).toEqual({ min: "GOOD", allowInsufficient: true });
    expect(parseRatingRule("STRONG:STRICT")).toEqual({ min: "STRONG", allowInsufficient: false });
    expect(evaluateEligibility(rules("GOOD"), profile(none)).canBid).toBe(true);
    expect(evaluateEligibility(rules("GOOD:STRICT"), profile(none)).canBid).toBe(false);
  });
  it("blocks a low band and passes a strong one", () => {
    expect(evaluateEligibility(rules("GOOD"), profile(watch)).canBid).toBe(false);
    expect(evaluateEligibility(rules("STRONG"), profile(strong)).canBid).toBe(true);
    expect(ratingRuleMet("GOOD", watch).met).toBe(false);
  });
});

describe("owner payment practice", () => {
  const d = (s: string) => new Date(s);
  it("needs three paid invoices from two suppliers", () => {
    expect(paymentPractice([{ awardedOrganizationId: "s1", dueDate: d("2026-01-10"), paidDate: d("2026-01-09") }]).sufficient).toBe(false);
    expect(paymentPractice(["a", "a", "a"].map((s) => ({ awardedOrganizationId: s, dueDate: d("2026-01-10"), paidDate: d("2026-01-09") }))).sufficient).toBe(false);
  });
  it("reports share paid by the due date and average days late", () => {
    const p = paymentPractice([
      { awardedOrganizationId: "s1", dueDate: d("2026-01-10"), paidDate: d("2026-01-10") },
      { awardedOrganizationId: "s2", dueDate: d("2026-01-10"), paidDate: d("2026-01-20") },
      { awardedOrganizationId: "s2", dueDate: d("2026-01-10"), paidDate: d("2026-01-05") },
      { awardedOrganizationId: "s2", dueDate: d("2026-01-10"), paidDate: null },
    ]);
    expect(p.sufficient).toBe(true);
    expect(p.payments).toBe(3);
    expect(p.paidOnTimePercent).toBe(67);
    expect(p.averageDaysLate).toBe(3);
  });
});
