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
    throw new ForbiddenException("You can only manage your own organization.");
  }
  if (!user.permissions.includes(permission)) {
    throw new ForbiddenException(`Missing permission: ${permission}`);
  }
}

export function assertPlatformStaff(user: RequestUser): void {
  if (user.platformStaffRole === "NONE") {
    throw new ForbiddenException("Platform staff only.");
  }
}
