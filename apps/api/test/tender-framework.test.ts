import { describe, expect, it } from "vitest";
import { canGiveSecondApproval, ceilingCheck, chooseSupplier, effectivePrice, holdActive, holdEndsAt, requiresSecondApproval } from "../src/tenders/tender-framework";

describe("framework rules", () => {
  it("needs a second authoriser only above the limit, counting recent orders to the same supplier", () => {
    expect(requiresSecondApproval(20000, 0, 25000).second).toBe(false);
    expect(requiresSecondApproval(25000, 0, 25000).second).toBe(false);
    expect(requiresSecondApproval(25000.01, 0, 25000).second).toBe(true);
    expect(requiresSecondApproval(12000, 14000, 25000)).toEqual({ tested: 26000, second: true });
  });
  it("a second authoriser cannot be the raiser or the first authoriser", () => {
    expect(canGiveSecondApproval("a", "a", "a")).toBe(false);
    expect(canGiveSecondApproval("b", "a", "a")).toBe(true);
    expect(canGiveSecondApproval("b", "a", "b")).toBe(false);
  });
  it("direct award picks the best rank; rotation picks the fewest call-offs", () => {
    const c = [{ contractId: "1", organizationId: "A", rank: 1, callOffs: 3 }, { contractId: "2", organizationId: "B", rank: 2, callOffs: 1 }, { contractId: "3", organizationId: "C", rank: 3, callOffs: 1 }];
    expect(chooseSupplier("DIRECT", c)?.organizationId).toBe("A");
    expect(chooseSupplier("ROTATION", c)?.organizationId).toBe("B");
    expect(chooseSupplier("ROTATION", [])).toBeNull();
  });
  it("prices are held from signature for the stated days", () => {
    const signed = new Date("2026-01-01T00:00:00Z");
    expect(holdEndsAt(signed, 90)?.toISOString().slice(0, 10)).toBe("2026-04-01");
    expect(holdActive(new Date("2026-03-31T00:00:00Z"), signed, 90)).toBe(true);
    expect(holdActive(new Date("2026-04-02T00:00:00Z"), signed, 90)).toBe(false);
  });
  it("an accepted review replaces the bid price; proposed or rejected ones do not", () => {
    expect(effectivePrice(10, [{ status: "PROPOSED", proposedPrice: 12, respondedAt: null }, { status: "REJECTED", proposedPrice: 9, respondedAt: new Date() }])).toBe(10);
    expect(effectivePrice(10, [{ status: "ACCEPTED", proposedPrice: 11, respondedAt: new Date(1) }, { status: "ACCEPTED", proposedPrice: 12, respondedAt: new Date(2) }])).toBe(12);
  });
  it("the ceiling warns but never blocks", () => {
    expect(ceilingCheck(null, 5, 5)).toEqual({ exceeded: false, remainingAfter: null });
    expect(ceilingCheck(100, 60, 30)).toEqual({ exceeded: false, remainingAfter: 10 });
    expect(ceilingCheck(100, 60, 50).exceeded).toBe(true);
  });
});
