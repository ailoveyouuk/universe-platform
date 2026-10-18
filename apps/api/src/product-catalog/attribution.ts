import { prisma } from "@universe/db";
import type { RequestUser } from "../auth/entra-auth.guard";

/** What other organisations see instead of a contributor's name (2026-10-18 pooled-database rule). */
export const ANONYMOUS_CONTRIBUTOR = "A Universe member";

type Viewer = Pick<RequestUser, "organizationId" | "platformStaffRole"> | undefined;

export interface AttributionContext {
  viewerOrgId: string | null;
  staff: boolean;
  /** Organisations that have chosen to be identifiable (Organization.shareIdentityWithUniverse). */
  visible: Set<string>;
}

/**
 * Everything an organisation adds goes into the pooled database and is searchable by every organisation, but anonymously by
 * default. The contributor's name is shown only to platform staff, to the contributing organisation itself, and to everyone
 * when the organisation has turned on "share with Universe" (or the product carries an explicit override). Reference data with
 * no contributing organisation is unaffected. A caller that passes no viewer always gets the anonymous view.
 */
export async function attributionContext(viewer: Viewer, orgIds: (string | null | undefined)[]): Promise<AttributionContext> {
  const ids = [...new Set(orgIds.filter((i): i is string => Boolean(i)))];
  const visible = new Set<string>();
  for (let i = 0; i < ids.length; i += 500) {
    const rows = await prisma.organization.findMany({ where: { id: { in: ids.slice(i, i + 500) }, shareIdentityWithUniverse: true }, select: { id: true } });
    for (const r of rows) visible.add(r.id);
  }
  return { viewerOrgId: viewer?.organizationId ?? null, staff: (viewer?.platformStaffRole ?? "NONE") !== "NONE", visible };
}

/** Returns the identity to show for a contributor: real, or anonymised (id withheld, generic name). */
export function maskContributor(ctx: AttributionContext, orgId: string | null | undefined, name: string | null | undefined, override?: boolean | null): { id: string | null; name: string | null; anonymised: boolean } {
  if (!orgId) return { id: null, name: name ?? null, anonymised: false };
  const show = ctx.staff || orgId === ctx.viewerOrgId || (override ?? ctx.visible.has(orgId));
  return show ? { id: orgId, name: name ?? null, anonymised: false } : { id: null, name: ANONYMOUS_CONTRIBUTOR, anonymised: true };
}
