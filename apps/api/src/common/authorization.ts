import { ForbiddenException } from "@nestjs/common";
import type { RequestUser } from "../auth/entra-auth.guard";

/**
 * Central place for the "is this caller allowed to act on this
 * organization" check used by admin-ish endpoints (inviting users, managing
 * roles, etc). Two ways in:
 *   - Platform staff (Universe's own operating team) can act on ANY organization.
 *   - Everyone else needs the named permission AND must be acting on their
 *     OWN organization — never someone else's, even with the permission.
 * Throws rather than returning a boolean so callers can't forget to check
 * the result.
 */
export function assertCanManageOrg(user: RequestUser, targetOrganizationId: string, permission: string): void {
  if (user.platformStaffRole !== "NONE") return;

  if (user.organizationId !== targetOrganizationId) {
    throw new ForbiddenException("You can only manage your own organisation.");
  }
  if (!user.permissions.includes(permission)) {
    throw new ForbiddenException(`Missing permission: ${permission}`);
  }
}

/**
 * Simple permission check for an action already known to be scoped to the
 * caller's own organisation (the caller already looked up the record via
 * tenantScope()/withTenantContext(), so there's no separate "own org"
 * question to ask the way assertCanManageOrg's admin-ish callers have).
 * Platform staff bypass, same as assertCanManageOrg — Universe's own
 * operating team isn't expected to hold every tenant's own QA/procurement
 * roles to support a customer.
 *
 * Added 2026-10-08 for the QA/procurement segregation-of-duties work
 * (Lewis: a procurement officer should be able to create a stakeholder
 * record and log evidence against it, but moving a stakeholder to
 * APPROVED, verifying evidence, or approving a product source should be
 * restricted to a Quality Assurance / Responsible Person role). This is
 * deliberately the "soft" segregation Lewis asked for — it checks the
 * caller's role-granted permission, not whether the caller is also the
 * person who created/logged the record being approved. A harder rule
 * (blocking self-verification) was explicitly NOT requested — see
 * compliance-standards-gap-analysis.md.
 */
export function assertHasPermission(user: RequestUser, permission: string): void {
  if (user.platformStaffRole !== "NONE") return;
  if (!user.permissions.includes(permission)) {
    throw new ForbiddenException(`Missing permission: ${permission}`);
  }
}

export function assertPlatformStaff(user: RequestUser): void {
  if (user.platformStaffRole === "NONE") {
    throw new ForbiddenException("Platform staff only.");
  }
}
