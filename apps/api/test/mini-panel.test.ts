import { describe, expect, it } from "vitest";
import { moderate, panelProgress } from "../src/tenders/mini-panel";

describe("mini-competition panel", () => {
  it("hides scores until every eligible evaluator has scored", () => {
    const part = panelProgress([{ evaluator: "A", score: 4, reason: "ok" }], 3, false);
    expect(part.scores).toBeNull(); expect(part.average).toBeNull(); expect(part.scored).toBe(1); expect(part.of).toBe(3);
    const all = panelProgress([{ evaluator: "A", score: 4, reason: "r" }, { evaluator: "B", score: 3, reason: "r" }, { evaluator: "C", score: 4, reason: "r" }], 3, false);
    expect(all.scores).toHaveLength(3); expect(all.spread).toBe(1); expect(all.average).toBe(3.67);
  });
  it("averages scores within one point", () => {
    expect(moderate([4, 3, 4], {})).toMatchObject({ score: 3.67, basis: "AVERAGE" });
    expect(moderate([2, 2], {}).score).toBe(2);
  });
  it("needs an agreed score and reason when the spread is wider than one point", () => {
    expect(() => moderate([1, 4], {})).toThrow(/differ by more than 1/);
    expect(() => moderate([1, 4], { score: 3, reason: "short" })).toThrow(/at least a sentence/);
    expect(moderate([1, 4], { score: 3, reason: "Panel discussed and agreed a middle score." })).toMatchObject({ score: 3, basis: "MODERATED" });
  });
  it("rejects an agreed score that is not a whole number from 0 to 5 and fewer than two scores", () => {
    expect(() => moderate([1, 4], { score: 6, reason: "x".repeat(25) })).toThrow(/whole number/);
    expect(() => moderate([1, 4], { score: 2.5, reason: "x".repeat(25) })).toThrow(/whole number/);
    expect(() => moderate([4], {})).toThrow(/At least two/);
  });
  it("lets a moderator choose a score even when the spread is small, with a reason", () => {
    expect(moderate([3, 4], { score: 4, reason: "Evaluators agreed the stronger reading is right." }).basis).toBe("MODERATED");
  });
});
