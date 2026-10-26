import { describe, expect, it } from "vitest";
import { appAllowed } from "../src/common/app-access.guard";

describe("server-side app access", () => {
  it("lets through anyone with no restriction (apps null)", () => expect(appAllowed(null, ["tender-issuance"])).toBe(true));
  it("lets through someone given the app", () => expect(appAllowed(["tender-issuance", "insights"], ["tender-issuance"])).toBe(true));
  it("blocks someone not given the app", () => expect(appAllowed(["insights"], ["tender-issuance"])).toBe(false));
  it("passes a shared endpoint if ANY listed app is given", () => {
    expect(appAllowed(["product-database"], ["project-management", "product-database"])).toBe(true);
    expect(appAllowed(["admin"], ["project-management", "product-database"])).toBe(false);
  });
  it("an empty list means no restriction", () => expect(appAllowed(["insights"], [])).toBe(true));
  it("a person restricted to no listed apps is blocked everywhere", () => expect(appAllowed([], ["project-management"])).toBe(false));
});

import { Reflector } from "@nestjs/core";
import { AppAccessGuard, RequiresApp } from "../src/common/app-access.guard";

describe("AppAccessGuard", () => {
  @RequiresApp("tender-issuance")
  class Gated { handler() { return 1; } }
  class Open { handler() { return 1; } }
  const ctx = (cls: new () => { handler(): number }, user: unknown) => ({
    getHandler: () => cls.prototype.handler, getClass: () => cls,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as never;
  const guard = new AppAccessGuard(new Reflector());
  it("allows a person given the app", () => expect(guard.canActivate(ctx(Gated, { apps: ["tender-issuance"] }))).toBe(true));
  it("allows an unrestricted person", () => expect(guard.canActivate(ctx(Gated, { apps: null }))).toBe(true));
  it("blocks a person without the app, naming it", () => expect(() => guard.canActivate(ctx(Gated, { apps: ["insights"] }))).toThrow(/Tender Issuance/));
  it("blocks when there is no signed-in user", () => expect(() => guard.canActivate(ctx(Gated, undefined))).toThrow());
  it("does nothing on an unmarked controller", () => expect(guard.canActivate(ctx(Open, { apps: ["insights"] }))).toBe(true));
});
