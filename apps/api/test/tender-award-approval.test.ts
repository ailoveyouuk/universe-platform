import { describe, expect, it } from "vitest";
import { awardRoute, checkApprover, isProposer } from "../src/tenders/tender-award-approval";

describe("award routing", () => {
  it("awards at once when limits are not confirmed", () => expect(awardRoute({ limitsConfirmed: false, withinOwnLimit: false })).toBe("AWARD_NOW"));
  it("awards at once when within the proposer's own limit", () => expect(awardRoute({ limitsConfirmed: true, withinOwnLimit: true })).toBe("AWARD_NOW"));
  it("holds for a second authoriser when above the proposer's limit", () => expect(awardRoute({ limitsConfirmed: true, withinOwnLimit: false })).toBe("NEEDS_SECOND_AUTHORISER"));
});

describe("second authoriser", () => {
  const base = { proposerId: "alice", limitsConfirmed: true, withinOwnLimit: true };
  it("accepts a different person whose limit covers the value", () => expect(checkApprover({ ...base, userId: "bob" })).toEqual({ ok: true, reason: null }));
  it("refuses the proposer approving their own proposal", () => { const r = checkApprover({ ...base, userId: "alice" }); expect(r.ok).toBe(false); expect(r.reason).toMatch(/someone other than/); });
  it("refuses a different person whose limit is too low", () => { const r = checkApprover({ ...base, userId: "bob", withinOwnLimit: false }); expect(r.ok).toBe(false); expect(r.reason).toMatch(/above your own approval limit/); });
  it("does not test the limit when limits are no longer confirmed", () => expect(checkApprover({ ...base, userId: "bob", limitsConfirmed: false, withinOwnLimit: false }).ok).toBe(true));
  it("still refuses the proposer when limits are no longer confirmed", () => expect(checkApprover({ ...base, userId: "alice", limitsConfirmed: false }).ok).toBe(false));
});

describe("withdrawing", () => {
  it("lets the proposer withdraw", () => expect(isProposer("alice", "alice")).toBe(true));
  it("treats anyone else as a rejecter", () => expect(isProposer("bob", "alice")).toBe(false));
  it("treats nobody as proposer when none is recorded", () => expect(isProposer("alice", null)).toBe(false));
});
