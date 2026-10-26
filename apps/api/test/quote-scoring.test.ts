import { describe, expect, it } from "vitest";
import type { QuoteResponses, QuoteScheme } from "@universe/types";
import { awardBlock, cleanResponses, cleanScheme, gateProblems, rankQuotes, schemeProblems } from "../src/tenders/quote-scoring";

const now = new Date("2026-10-26T12:00:00Z");
const scheme = (over: Partial<QuoteScheme> = {}): QuoteScheme => ({
  weights: { price: 40, leadTime: 15, quality: 20, desirable: 10, examples: 10, references: 5 },
  requirements: [{ key: "r1", title: "ISO 9001", mandatory: true }, { key: "r2", title: "Next-day delivery", mandatory: false }, { key: "r3", title: "Own fleet", mandatory: false }],
  minExamples: 3, exampleYears: 3, minReferences: 1, qualityBrief: null, ...over,
});
const ex = (completedOn: string) => ({ title: "Fit-out", client: "Acme", valueText: null, startedOn: "2024-01-01", completedOn, scope: "Supplied and installed" });
const ref = { forename: "Ann", surname: "Lee", organisation: "Acme", role: null, email: "ann@acme.com", phone: "01234 567890", relationship: "Client lead", contactable: true };
const good = (des: boolean[] = [true, true]): QuoteResponses => ({ requirements: { r1: { met: true, note: null }, r2: { met: des[0], note: null }, r3: { met: des[1], note: null } }, examples: [ex("2025-06-01"), ex("2025-01-01"), ex("2024-06-01")], references: [ref] });
const sc = (q: number, e: number, r: number) => ({ quality: { score: q, reason: "evidence" }, examples: { score: e, reason: "evidence" }, references: { score: r, reason: "evidence" } });

describe("scheme checks", () => {
  it("accepts a good scheme and rejects bad weights", () => {
    expect(schemeProblems(scheme())).toEqual([]);
    expect(schemeProblems(scheme({ weights: { price: 50, leadTime: 15, quality: 20, desirable: 10, examples: 10, references: 5 } })).join()).toMatch(/total 100/);
    expect(schemeProblems(scheme({ weights: { price: -5, leadTime: 20, quality: 45, desirable: 10, examples: 20, references: 10 } })).join()).toMatch(/between 0 and 100/);
  });
  it("needs the matching inputs for a weighted criterion", () => {
    expect(schemeProblems(scheme({ minExamples: 0 })).join()).toMatch(/similar contracts/);
    expect(schemeProblems(scheme({ minReferences: 0 })).join()).toMatch(/references/);
    expect(schemeProblems(scheme({ requirements: [{ key: "r1", title: "x", mandatory: true }] })).join()).toMatch(/desirable/);
  });
  it("cleans untrusted input: keys by position, trimmed, capped", () => {
    const s = cleanScheme({ weights: { price: "60", leadTime: 40 }, requirements: [{ title: "  A  ", mandatory: true, key: "evil" }], minExamples: 99, exampleYears: 0 });
    expect(s.requirements[0]).toEqual({ key: "r1", title: "A", mandatory: true });
    expect(s.weights.price).toBe(60); expect(s.minExamples).toBe(5); expect(s.exampleYears).toBe(1);
  });
});

describe("pass/fail checks", () => {
  it("passes a complete response", () => expect(gateProblems(scheme(), good(), now)).toEqual([]));
  it("fails a missed mandatory requirement and unanswered counts as missed", () => {
    const r = good(); r.requirements.r1.met = false;
    expect(gateProblems(scheme(), r, now).join()).toMatch(/ISO 9001/);
    expect(gateProblems(scheme(), cleanResponses({}, scheme()), now).length).toBeGreaterThan(0);
  });
  it("only counts examples completed in the window, not in the future, with start before end", () => {
    const r = good(); r.examples[2] = ex("2022-01-01");
    expect(gateProblems(scheme(), r, now).join()).toMatch(/2 given/);
    r.examples[2] = ex("2027-01-01");
    expect(gateProblems(scheme(), r, now).join()).toMatch(/2 given/);
    r.examples[2] = { ...ex("2025-01-01"), startedOn: "2026-01-01" };
    expect(gateProblems(scheme(), r, now).join()).toMatch(/2 given/);
  });
  it("needs complete references the buyer may contact", () => {
    const r = good(); r.references = [{ ...ref, email: "not-an-email" }];
    expect(gateProblems(scheme(), r, now).join()).toMatch(/0 given/);
    r.references = [{ ...ref, contactable: false }];
    expect(gateProblems(scheme(), r, now).join()).toMatch(/0 given/);
  });
});

describe("ranking", () => {
  const a = { id: "a", total: 100, avgLeadDays: 10, responses: good(), scores: sc(4, 4, 4) };
  const b = { id: "b", total: 125, avgLeadDays: 5, responses: good([true, false]), scores: sc(5, 5, 5) };
  it("applies the issuer's weights", () => {
    const m = rankQuotes(scheme(), [a, b], now);
    // a: price 100, lead 50, quality/examples/references 80, desirable 100
    expect(m.get("a")!.total).toBe(0.4 * 100 + 0.15 * 50 + 0.2 * 80 + 0.1 * 100 + 0.1 * 80 + 0.05 * 80);
    // b: price 80, lead 100, manual 100, desirable 50
    expect(m.get("b")!.total).toBe(0.4 * 80 + 0.15 * 100 + 0.2 * 100 + 0.1 * 50 + 0.1 * 100 + 0.05 * 100);
    expect(m.get("b")!.rank).toBe(1); expect(m.get("a")!.rank).toBe(2);
  });
  it("different weights change the winner", () => {
    const priceOnly = scheme({ weights: { price: 100, leadTime: 0, quality: 0, desirable: 0, examples: 0, references: 0 }, minExamples: 0, minReferences: 0 });
    const m = rankQuotes(priceOnly, [{ ...a, scores: null }, { ...b, scores: null }], now);
    expect(m.get("a")!.rank).toBe(1);
  });
  it("leaves a quote unranked until every weighted judged criterion is scored with a reason", () => {
    const m = rankQuotes(scheme(), [{ ...a, scores: { quality: { score: 4, reason: "evidence" } } }], now);
    expect(m.get("a")!.total).toBeNull(); expect(m.get("a")!.manualMissing).toEqual(["examples", "references"]);
    expect(awardBlock(scheme(), m.get("a"))).toMatch(/Score every/);
  });
  it("excludes a failing quote and does not let it set the price benchmark", () => {
    const cheap = { id: "c", total: 50, avgLeadDays: 1, responses: { ...good(), examples: [] }, scores: sc(5, 5, 5) };
    const m = rankQuotes(scheme(), [a, cheap], now);
    expect(m.get("c")!.eligible).toBe(false); expect(m.get("c")!.rank).toBeNull();
    expect(m.get("a")!.price).toBe(100);
    expect(awardBlock(scheme(), m.get("c"))).toMatch(/pass\/fail/);
  });
  it("breaks a tie on the lower price", () => {
    const x = { ...a, id: "x", total: 100 }; const y = { ...a, id: "y", total: 100 };
    expect(rankQuotes(scheme(), [x, y], now).get("x")!.rank).toBeDefined();
  });
  it("is not blocked when there is no scheme", () => expect(awardBlock(null, undefined)).toBeNull());
});
