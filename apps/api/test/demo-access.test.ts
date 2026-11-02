import { describe, expect, it } from "vitest";
import { demoWriteAllowed } from "../src/auth/demo-access";

describe("Demo Access read-only rule", () => {
  it("allows reading", () => {
    for (const m of ["GET", "get", "HEAD", "OPTIONS"]) expect(demoWriteAllowed(m, "/projects")).toBe(true);
  });
  it("refuses every change", () => {
    for (const m of ["POST", "PUT", "PATCH", "DELETE"]) expect(demoWriteAllowed(m, "/projects")).toBe(false);
    expect(demoWriteAllowed("POST", "/crm/saved-filters")).toBe(false);
    expect(demoWriteAllowed("PATCH", "/users/abc")).toBe(false);
    expect(demoWriteAllowed("DELETE", "/me")).toBe(false);
  });
  it("lets a Demo Access person change only their own colour theme", () => {
    expect(demoWriteAllowed("PATCH", "/me/preferences")).toBe(true);
    expect(demoWriteAllowed("PATCH", "/me/preferences/")).toBe(true);
    expect(demoWriteAllowed("PATCH", "/me/preferences/other")).toBe(false);
    expect(demoWriteAllowed("POST", "/me/preferences")).toBe(false);
  });
});
