import { describe, expect, it } from "vitest";
import { appForNotification } from "@universe/types";
import { NotificationsService } from "../src/notifications/notifications.service";

describe("which app a notification belongs to", () => {
  it("goes by the link first", () => {
    expect(appForNotification("TENDER", "/tenders/manage?id=1")).toBe("tender-issuance");
    expect(appForNotification("TENDER", "/bids/status?id=1")).toBe("tender-issuance");
    expect(appForNotification("QUALITY", "/products/detail?id=1")).toBe("product-database");
    expect(appForNotification("SYSTEM", "/exports")).toBe("product-database");
    expect(appForNotification("QUALITY", "/quality/product-amendments")).toBe("project-management");
    expect(appForNotification("PROJECT", "/projects/detail?id=1")).toBe("project-management");
  });
  it("falls back to the category, and SYSTEM belongs to no app", () => {
    expect(appForNotification("TENDER", null)).toBe("tender-issuance");
    expect(appForNotification("RISK", null)).toBe("project-management");
    expect(appForNotification("SYSTEM", null)).toBeNull();
  });
});

describe("notification scope for a restricted person", () => {
  const svc = new NotificationsService() as unknown as { mine(u: unknown): Record<string, unknown> };
  const user = (apps: string[] | null) => ({ id: "u1", organizationId: "o1", apps });
  it("is the plain own-items filter with no restriction", () => {
    expect(svc.mine(user(null))).toEqual({ recipientUserId: "u1", organizationId: "o1" });
  });
  it("is the plain filter when every app that owns notifications is allowed", () => {
    expect(svc.mine(user(["project-management", "product-database", "tender-issuance", "admin", "insights"]))).toEqual({ recipientUserId: "u1", organizationId: "o1" });
  });
  it("hides tender items from someone without Tender Issuance, but keeps unlinked and other items", () => {
    const w = svc.mine(user(["project-management", "product-database"])) as { OR: Array<Record<string, any>> };
    expect(w.OR[0]).toEqual({ link: null, category: { notIn: ["TENDER"] } });
    expect(w.OR[1].link).toEqual({ not: null });
    expect(JSON.stringify(w.OR[1].NOT)).toContain("/tenders");
    expect(JSON.stringify(w.OR[1].NOT)).not.toContain("/projects");
  });
});
