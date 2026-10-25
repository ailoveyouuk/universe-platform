import { describe, expect, it } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { InsightsAccessGuard } from "../src/insights/insights-access.guard";
import { canUseApp, encodeAppAccess, parseAppAccess } from "@universe/types";

const ctx = (user: unknown) => ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as never;

describe("app access", () => {
  it("round-trips and ignores unknown keys", () => {
    expect(encodeAppAccess(["insights", "admin", "insights", "nope"])).toBe(",insights,admin,");
    expect(parseAppAccess(",insights,admin,")).toEqual(["insights", "admin"]);
    expect(parseAppAccess(null)).toBeNull();
    expect(encodeAppAccess([])).toBeNull();
  });
  it("null means every app", () => {
    expect(canUseApp(null, "insights")).toBe(true);
    expect(canUseApp(["admin"], "insights")).toBe(false);
  });
  it("guard allows unrestricted and listed users, blocks others", () => {
    const g = new InsightsAccessGuard();
    expect(g.canActivate(ctx({ apps: null }))).toBe(true);
    expect(g.canActivate(ctx({ apps: ["insights"] }))).toBe(true);
    expect(() => g.canActivate(ctx({ apps: ["admin"] }))).toThrow(ForbiddenException);
    expect(() => g.canActivate(ctx(undefined))).toThrow(ForbiddenException);
  });
});
