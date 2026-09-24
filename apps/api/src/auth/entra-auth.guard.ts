import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { createTokenVerifier } from "@universe/auth";
import { prisma, PlatformStaffRole, UserStatus } from "@universe/db";
import type { Request } from "express";

export interface RequestUser {
  id: string;
  organizationId: string;
  email: string;
  forename: string;
  surname: string;
  platformStaffRole: PlatformStaffRole;
  permissions: string[];
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
  userRoles: { role: { rolePermissions: { permission: { key: string } }[] } }[];
}): RequestUser {
  const permissions = user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.key));
  return {
    id: user.id,
    organizationId: user.organizationId,
    email: user.email,
    forename: user.forename,
    surname: user.surname,
    platformStaffRole: user.platformStaffRole as PlatformStaffRole,
    permissions: [...new Set(permissions)],
  };
}

const userInclude = {
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
 * STUB: wire UNIVERSE_CIAM_TENANT_ID / UNIVERSE_CIAM_API_AUDIENCE env vars
 * before deploying. Left permissive (verification skipped, fixed local
 * dev user) when those are unset so local dev doesn't require a full CIAM
 * tenant to run — that fallback must never reach a real deployment, and it
 * still goes through the same email-linking logic below rather than
 * bypassing it, so the invitation flow can be exercised locally.
 */
@Injectable()
export class EntraAuthGuard implements CanActivate {
  private verify =
    process.env.UNIVERSE_CIAM_TENANT_ID && process.env.UNIVERSE_CIAM_API_AUDIENCE
      ? createTokenVerifier({
          tenantId: process.env.UNIVERSE_CIAM_TENANT_ID,
          audience: process.env.UNIVERSE_CIAM_API_AUDIENCE,
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

    // 1. Already-linked identity — the common case after first sign-in.
    let user = await prisma.user.findUnique({ where: { entraObjectId: oid }, include: userInclude });

    // 2. First sign-in for a pre-invited email — link it now.
    if (!user) {
      const invited = await prisma.user.findUnique({ where: { email } });
      if (invited && invited.status === UserStatus.INVITED && !invited.entraObjectId) {
        user = await prisma.user.update({
          where: { id: invited.id },
          data: { entraObjectId: oid, status: UserStatus.ACTIVE, firstSignInAt: new Date() },
          include: userInclude,
        });
      }
    }

    // 3. No match at all, or matched an email that was never INVITED (e.g.
    //    already DEACTIVATED before ever signing in) — reject. This is the
    //    "not on the allowed list" case Lewis described.
    if (!user) {
      throw new ForbiddenException(
        "This Microsoft account has not been added to Universe. Ask your organization admin to add you.",
      );
    }

    if (user.status === UserStatus.DEACTIVATED) {
      throw new ForbiddenException("This account has been deactivated.");
    }

    req.user = toRequestUser(user);
    return true;
  }
}
