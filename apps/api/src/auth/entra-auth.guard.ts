import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { createTokenVerifier } from "@universe/auth";
import { PlatformStaffRole, UserStatus, withPlatformStaffContext } from "@universe/db";
import { parseAppAccess } from "@universe/types";
import type { Request } from "express";

export interface RequestUser {
  id: string;
  /** The organisation this request runs as. For ordinary users always their
   * own; platform staff may choose another via the X-Universe-Organization
   * header (see canActivate), in which case this is the chosen organisation. */
  organizationId: string;
  /** The caller's own organisation — differs from organizationId only when
   * platform staff are acting inside another organisation. */
  homeOrganizationId: string;
  email: string;
  forename: string;
  surname: string;
  // Added 2026-09-26 for the personalized "powered by Universe" header —
  // see Organization.logoUrl's doc comment in schema.prisma. Included here
  // (rather than a separate /organizations/me call) since every app needs
  // this on every authenticated page load, not just org-management screens.
  organizationName: string;
  organizationLogoUrl: string | null;
  organizationLogoIconUrl: string | null;
  organizationPrimaryColor: string | null;
  organizationSecondaryColor: string | null;
  organizationWelcomeMessage: string | null;
  platformStaffRole: PlatformStaffRole;
  permissions: string[];
  /** Apps this person may use; null = every app. Platform staff are never restricted. */
  apps: string[] | null;
  /** True for non-staff users whose home organisation is a demo sandbox: they may write inside it but never to data shared across organisations. */
  isDemoUser?: boolean;
  /** True when this request runs inside a demo organisation (a demo user's own, or one platform staff switched into). Gates visibility of simulated shared data. */
  inDemoOrganization?: boolean;
}

function toRequestUser(user: {
  id: string;
  organizationId: string;
  email: string;
  forename: string;
  surname: string;
  // Prisma only knows this as a plain `string` column (SQL Server has no
  // native enum support — see schema.prisma header comment and
  // packages/db/src/enums.ts). Narrowed to PlatformStaffRole below since
  // the database only ever stores one of that const object's values.
  platformStaffRole: string;
  appAccess?: string | null;
  organization: { name: string; isDemo: boolean; logoUrl: string | null; logoIconUrl: string | null; primaryColor: string | null; secondaryColor: string | null; welcomeMessage: string | null };
  userRoles: { role: { rolePermissions: { permission: { key: string } }[] } }[];
}): RequestUser {
  const permissions = user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.key));
  return {
    id: user.id,
    organizationId: user.organizationId,
    homeOrganizationId: user.organizationId,
    email: user.email,
    forename: user.forename,
    surname: user.surname,
    organizationName: user.organization.name,
    organizationLogoUrl: user.organization.logoUrl,
    organizationLogoIconUrl: user.organization.logoIconUrl,
    organizationPrimaryColor: user.organization.primaryColor,
    organizationSecondaryColor: user.organization.secondaryColor,
    organizationWelcomeMessage: user.organization.welcomeMessage,
    platformStaffRole: user.platformStaffRole as PlatformStaffRole,
    permissions: [...new Set(permissions)],
    apps: user.platformStaffRole === PlatformStaffRole.NONE ? parseAppAccess(user.appAccess) : null,
    isDemoUser: user.organization.isDemo && user.platformStaffRole === PlatformStaffRole.NONE,
    inDemoOrganization: user.organization.isDemo,
  };
}

const userInclude = {
  organization: { select: { name: true, isDemo: true, status: true, logoUrl: true, logoIconUrl: true, primaryColor: true, secondaryColor: true, welcomeMessage: true } },
  userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
} as const;

/**
 * Verifies the caller's access token issued by the UNIVERSE CIAM TENANT
 * (Microsoft Entra External ID — a dedicated tenant for Universe, not tied
 * to any one customer organization's own corporate Entra ID, so different
 * organizations' identities never mix. See architecture doc, "External SSO").
 *
 * ONBOARDING / INVITATION FLOW (see the User model's doc comment in
 * packages/db/prisma/schema.prisma for the full picture):
 *   1. A platform-staff member or org admin creates a User row via the
 *      Admin app — email, name, organization, and role(s) set up front,
 *      status INVITED, entraObjectId null. NOTHING happens on the identity
 *      side yet; the person hasn't touched Universe.
 *   2. The first time that email successfully authenticates through the
 *      Universe CIAM tenant, THIS GUARD links the verified oid to that row
 *      by matching email, and flips status to ACTIVE.
 *   3. Every sign-in after that is matched by entraObjectId — email is
 *      never used to look up an already-linked account, only to perform
 *      the one-time link on first sign-in.
 * An identity with no matching row (by entraObjectId OR by email+INVITED)
 * is rejected outright. There is no auto-provisioning path — a verified
 * Microsoft identity is not, by itself, a reason to grant access.
 *
 * Wired to the real Universe CIAM tenant (Universe Platform,
 * universeplatform.onmicrosoft.com / universeplatform.ciamlogin.com,
 * tenant ID 23851fd3-0682-4268-af83-338cfea80d89) via
 * UNIVERSE_CIAM_TENANT_ID / UNIVERSE_CIAM_API_AUDIENCE /
 * UNIVERSE_CIAM_TENANT_SUBDOMAIN — see infra/bicep/modules/containerApp.bicep
 * for how these reach the Container App. Left permissive (verification
 * skipped, fixed local dev user) when UNIVERSE_CIAM_TENANT_ID /
 * UNIVERSE_CIAM_API_AUDIENCE are unset so local dev doesn't require the
 * real CIAM tenant to run — that fallback must never reach a real
 * deployment, and it still goes through the same email-linking logic below
 * rather than bypassing it, so the invitation flow can be exercised
 * locally.
 */
@Injectable()
export class EntraAuthGuard implements CanActivate {
  private verify =
    process.env.UNIVERSE_CIAM_TENANT_ID && process.env.UNIVERSE_CIAM_API_AUDIENCE
      ? createTokenVerifier({
          tenantId: process.env.UNIVERSE_CIAM_TENANT_ID,
          audience: process.env.UNIVERSE_CIAM_API_AUDIENCE,
          tenantSubdomain: process.env.UNIVERSE_CIAM_TENANT_SUBDOMAIN,
        })
      : null;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: RequestUser }>();
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }
    const token = authHeader.slice("Bearer ".length);

    let oid: string;
    let email: string;

    if (!this.verify) {
      // Local dev fallback — no CIAM tenant configured yet. Still goes
      // through real lookup/link logic below; only token verification is
      // skipped. Set LOCAL_DEV_EMAIL to test as a specific invited user.
      oid = "local-dev";
      email = process.env.LOCAL_DEV_EMAIL ?? "dev@localhost";
    } else {
      const payload = await this.verify(token).catch(() => {
        throw new UnauthorizedException("Invalid token");
      });
      oid = payload.oid as string;
      email = ((payload.preferred_username as string) ?? (payload.upn as string)) as string;
      if (!oid || !email) {
        throw new UnauthorizedException("Token missing required claims");
      }
    }

    // Identity resolution happens BEFORE the caller's organization is known
    // (that's the whole point — we don't know who they are yet), so there is
    // no organizationId to scope a normal tenant request by. This is exactly
    // the sanctioned platform-level exception withPlatformStaffContext
    // exists for (see packages/db/src/tenant-context.ts and
    // apps/api/src/common/tenant-scoped.ts) — NOT a shortcut around RLS, but
    // the one place a lookup genuinely has to span every organization by
    // design. Everything past this block runs scoped to req.user's own
    // organizationId as normal.
    const user = await withPlatformStaffContext(async (tx) => {
      // 1. Already-linked identity — the common case after first sign-in.
      const existing = await tx.user.findUnique({ where: { entraObjectId: oid }, include: userInclude });
      if (existing) return existing;

      // 2. First sign-in for a pre-invited email — link it now.
      const invited = await tx.user.findUnique({ where: { email } });
      if (invited && invited.status === UserStatus.INVITED && !invited.entraObjectId) {
        return tx.user.update({
          where: { id: invited.id },
          data: { entraObjectId: oid, status: UserStatus.ACTIVE, firstSignInAt: new Date() },
          include: userInclude,
        });
      }

      return null;
    });

    // 3. No match at all, or matched an email that was never INVITED (e.g.
    //    already DEACTIVATED before ever signing in) — reject. This is the
    //    "not on the allowed list" case Lewis described.
    if (!user) {
      throw new ForbiddenException(
        "This Microsoft account has not been added to Universe. Ask your organisation admin to add you.",
      );
    }

    if (user.status === UserStatus.DEACTIVATED) {
      throw new ForbiddenException("This account has been deactivated.");
    }

    // A SUSPENDED organisation (set by platform staff in the Admin app) locks
    // out every one of its users on their next request. Platform staff are
    // exempt so Universe's own team can always get in to investigate/restore.
    if (user.organization.status === "SUSPENDED" && user.platformStaffRole === PlatformStaffRole.NONE) {
      throw new ForbiddenException("Your organisation's access to Universe has been suspended. Contact Universe support.");
    }

    const requestUser = toRequestUser(user);

    // Platform staff may act inside any organisation: the apps send the one
    // they picked in the header switcher as X-Universe-Organization, and the
    // whole request then runs scoped to it (name/branding included, so the
    // UI reflects it). Ignored for everyone else — an ordinary user can never
    // widen their reach by sending this header. A bad id is a clear 400, not a
    // silent fallback to the home org, so nobody edits the wrong tenant.
    const requested = req.headers["x-universe-organization"];
    const requestedId = Array.isArray(requested) ? requested[0] : requested;
    // Demo users (2026-10-20) may do the same between demo organisations they have been granted access to
    // (user_organization_access), keeping their own permissions. Never beyond demo organisations: both the
    // home and the target organisation must be demo ones, checked on every request.
    let allowedSwitch = !!requestedId && requestedId !== user.organizationId && user.platformStaffRole !== PlatformStaffRole.NONE;
    if (!allowedSwitch && requestedId && requestedId !== user.organizationId && user.organization.isDemo) {
      const grant = await withPlatformStaffContext((tx) =>
        tx.userOrganizationAccess.findFirst({ where: { userId: user.id, grantedOrganizationId: requestedId, grantedOrganization: { isDemo: true, status: { not: "SUSPENDED" } } }, select: { id: true } }),
      );
      allowedSwitch = !!grant;
    }
    if (requestedId && allowedSwitch) {
      const target = await withPlatformStaffContext((tx) =>
        tx.organization.findUnique({
          where: { id: requestedId },
          select: { id: true, name: true, isDemo: true, logoUrl: true, logoIconUrl: true, primaryColor: true, secondaryColor: true, welcomeMessage: true },
        }),
      );
      if (!target) throw new BadRequestException("The selected organisation does not exist.");
      requestUser.organizationId = target.id;
      requestUser.organizationName = target.name;
      requestUser.inDemoOrganization = target.isDemo;
      requestUser.organizationLogoUrl = target.logoUrl;
      requestUser.organizationLogoIconUrl = target.logoIconUrl;
      requestUser.organizationPrimaryColor = target.primaryColor;
      requestUser.organizationSecondaryColor = target.secondaryColor;
      requestUser.organizationWelcomeMessage = target.welcomeMessage;
    }

    req.user = requestUser;
    return true;
  }
}
