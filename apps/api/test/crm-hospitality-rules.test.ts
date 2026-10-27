import { describe, expect, it } from "vitest";
import { evaluateHospitality, type PolicyRules } from "../src/crm/crm-hospitality-rules";

const P: PolicyRules = { currency: "GBP", giftThreshold: 50, hospitalityThreshold: 150, annualThreshold: 300, alwaysApprovePublicOfficial: true };
const base = { direction: "RECEIVED", category: "GIFT", publicOfficial: false, value: 20, priorTwelveMonths: 0 } as const;

describe("gifts and hospitality rules", () => {
  it("a small gift needs no approval", () => expect(evaluateHospitality(P, base)).toEqual({ requiresApproval: false, reasons: [] }));
  it("a gift above the gift threshold needs approval and says why", () => {
    const r = evaluateHospitality(P, { ...base, value: 75 });
    expect(r.requiresApproval).toBe(true); expect(r.reasons[0]).toContain("gift threshold");
  });
  it("hospitality uses its own, higher threshold", () => {
    expect(evaluateHospitality(P, { ...base, category: "MEAL", value: 100 }).requiresApproval).toBe(false);
    expect(evaluateHospitality(P, { ...base, category: "MEAL", value: 160 }).requiresApproval).toBe(true);
  });
  it("a threshold exactly met is not exceeded", () => expect(evaluateHospitality(P, { ...base, value: 50 }).requiresApproval).toBe(false));
  it("the yearly total for one stakeholder counts", () => {
    const r = evaluateHospitality(P, { ...base, value: 40, priorTwelveMonths: 280 });
    expect(r.requiresApproval).toBe(true); expect(r.reasons.join(" ")).toContain("yearly threshold");
  });
  it("a public official always needs approval when the policy says so, and not when it does not", () => {
    expect(evaluateHospitality(P, { ...base, publicOfficial: true, value: 0 }).requiresApproval).toBe(true);
    expect(evaluateHospitality({ ...P, alwaysApprovePublicOfficial: false }, { ...base, publicOfficial: true }).requiresApproval).toBe(false);
  });
  it("donations and sponsorship always need approval", () => {
    expect(evaluateHospitality(P, { ...base, category: "DONATION", value: 1 }).requiresApproval).toBe(true);
    expect(evaluateHospitality(P, { ...base, category: "SPONSORSHIP", value: 1 }).requiresApproval).toBe(true);
  });
  it("a declined offer never needs approval, even from a public official", () => {
    expect(evaluateHospitality(P, { ...base, direction: "DECLINED", publicOfficial: true, value: 900 })).toEqual({ requiresApproval: false, reasons: [] });
  });
  it("an unreadable value is sent for approval rather than guessed", () => {
    const r = evaluateHospitality(P, { ...base, value: null });
    expect(r.requiresApproval).toBe(true); expect(r.reasons[0]).toContain("could not be read");
  });
});
