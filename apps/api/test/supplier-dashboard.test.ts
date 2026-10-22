import { describe, expect, it } from "vitest";
import { countByKind, isUrgent, sortWaiting, type WaitingItem } from "../src/supplier-portal/supplier-dashboard";

const now = new Date("2026-10-22T12:00:00Z");
const day = 86_400_000;
const item = (o: Partial<WaitingItem>): WaitingItem => ({ kind: "MILESTONE", title: "t", detail: "d", dueAt: null, overdue: false, path: "/", ...o });

describe("supplier dashboard rules", () => {
  it("sorts overdue first, then soonest, then undated", () => {
    const a = item({ title: "undated" }), b = item({ title: "later", dueAt: new Date(now.getTime() + 9 * day) }), c = item({ title: "soon", dueAt: new Date(now.getTime() + 2 * day) });
    const d = item({ title: "late", overdue: true, dueAt: new Date(now.getTime() - day) });
    expect(sortWaiting([a, b, c, d]).map((x) => x.title)).toEqual(["late", "soon", "later", "undated"]);
  });
  it("treats overdue and items due within seven days as urgent", () => {
    expect(isUrgent(item({ overdue: true }), now)).toBe(true);
    expect(isUrgent(item({ dueAt: new Date(now.getTime() + 6 * day) }), now)).toBe(true);
    expect(isUrgent(item({ dueAt: new Date(now.getTime() + 8 * day) }), now)).toBe(false);
    expect(isUrgent(item({}), now)).toBe(false);
  });
  it("counts by kind, zero for the rest", () => {
    const c = countByKind([item({ kind: "CALL_OFF" }), item({ kind: "CALL_OFF" }), item({ kind: "EVIDENCE" })]);
    expect(c.CALL_OFF).toBe(2); expect(c.EVIDENCE).toBe(1); expect(c.INVITATION).toBe(0);
  });
});
