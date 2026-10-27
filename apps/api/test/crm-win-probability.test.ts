import { describe, expect, it } from "vitest";
import { STAGE_PRIOR, WinModel, reachedStages, type ClosedSample } from "../src/crm/crm-win-probability";

const closed = (outcome: "WON" | "LOST", over: Partial<ClosedSample> = {}): ClosedSample => ({ outcome, kind: "TENDER", commodityGroup: "PHARMACEUTICALS", relationshipId: "r1", reached: ["IDENTIFIED", "QUALIFYING", "ENGAGED", "SUBMITTED"], ...over });
const open = { stage: "SUBMITTED", kind: "TENDER", commodityGroup: "PHARMACEUTICALS", relationshipId: "r1" };

describe("win probability", () => {
  it("falls back to the stage prior when there is no history", () => {
    const e = new WinModel([]).estimate(open)!;
    expect(e.probability).toBeCloseTo(STAGE_PRIOR.SUBMITTED, 2);
  });
  it("rises with stage", () => {
    const m = new WinModel([]);
    const p = ["IDENTIFIED", "QUALIFYING", "ENGAGED", "SUBMITTED"].map((stage) => m.estimate({ ...open, stage })!.probability);
    expect([...p].sort((a, b) => a - b)).toEqual(p);
  });
  it("moves up for a like-for-like segment that wins often, and down where it loses", () => {
    const wins = Array.from({ length: 12 }, () => closed("WON")); const losses = Array.from({ length: 4 }, () => closed("LOST", { commodityGroup: "SHELTER", relationshipId: "r2" }));
    const m = new WinModel([...wins, ...losses]);
    const good = m.estimate(open)!.probability; const bad = m.estimate({ ...open, commodityGroup: "SHELTER", relationshipId: "r2" })!.probability;
    expect(good).toBeGreaterThan(bad);
  });
  it("is not swung by one or two past deals", () => {
    const base = new WinModel([]).estimate(open)!.probability;
    const one = new WinModel([closed("LOST")]).estimate(open)!.probability;
    expect(Math.abs(base - one)).toBeLessThan(0.1);
  });
  it("stays within bounds and reports its evidence", () => {
    const m = new WinModel(Array.from({ length: 200 }, () => closed("WON")));
    const e = m.estimate({ ...open, stage: "SUBMITTED" })!;
    expect(e.probability).toBeLessThanOrEqual(0.95); expect(e.basis.segmentHistory.n).toBe(200); expect(e.basis.stakeholderHistory.won).toBe(200);
    expect(new WinModel([]).estimate({ ...open, stage: "WON" })).toBeNull();
  });
  it("lists the stages passed through", () => {
    expect(reachedStages([{ toStage: "IDENTIFIED" }, { toStage: "QUALIFYING" }], "WON").sort()).toEqual(["IDENTIFIED", "QUALIFYING", "WON"]);
  });
});
