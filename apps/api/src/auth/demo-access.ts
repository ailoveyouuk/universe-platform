import { withPlatformStaffContext } from "@universe/db";
import { cached } from "../common/ttl-cache";

/**
 * Demo Access (2026-11-02). A person with Demo Access switched on (Admin, Users, the person's page) sees the whole platform but only
 * through the demo organisation: every request runs inside Universe Demo (so only simulated data is visible, and the database's own
 * row-level security keeps it that way), with view permissions only, and nothing can be changed. This is enforced in the sign-in guard,
 * not in each screen, so a new feature cannot forget it.
 */

/** Reads are always allowed. The only change a Demo Access person may make is their own colour theme. */
export function demoWriteAllowed(method: string, path: string): boolean {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return true;
  return m === "PATCH" && /^\/me\/preferences\/?$/.test(path);
}

export interface DemoView {
  org: { id: string; name: string; logoUrl: string | null; logoIconUrl: string | null; primaryColor: string | null; secondaryColor: string | null; welcomeMessage: string | null } | null;
  /** Every "...view" permission in the catalogue, so every app opens, but nothing that creates, edits, approves or manages. */
  permissionKeys: string[];
}

/** The demo organisation and the view-only permission set, cached briefly (shared by every Demo Access request). */
export function loadDemoView(): Promise<DemoView> {
  return cached("demo-access:view", 30_000, () =>
    withPlatformStaffContext(async (tx) => {
      const org = await tx.organization.findFirst({
        where: { isDemo: true, name: "Universe Demo", status: { not: "SUSPENDED" } },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, logoUrl: true, logoIconUrl: true, primaryColor: true, secondaryColor: true, welcomeMessage: true },
      });
      const perms = await tx.permission.findMany({ where: { key: { endsWith: ".view" } }, select: { key: true } });
      return { org, permissionKeys: perms.map((p: { key: string }) => p.key) } as DemoView;
    }),
  );
}
