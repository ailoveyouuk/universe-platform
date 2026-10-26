import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { canUseApp, UNIVERSE_APP_LABELS, type UniverseAppKey } from "@universe/types";
import type { Request } from "express";
import type { RequestUser } from "../auth/entra-auth.guard";

const KEY = "universe:requires-app";

/**
 * Server-side app access (2026-10-26). Admin > Users > Apps chooses which apps each person may use; until now only Insights enforced that on the
 * server, the other apps hid themselves in the browser. Mark a controller with the app (or apps) whose screens call it. A person may pass if they
 * have ANY of the listed apps; shared endpoints list every app that uses them. A person with no restriction (apps null) and platform staff
 * (never restricted) always pass. Controllers also list AppAccessGuard after EntraAuthGuard so the user is known when it runs.
 */
export const RequiresApp = (...apps: UniverseAppKey[]) => SetMetadata(KEY, apps);

/** True when the person may use at least one of the apps. No apps listed means no restriction. */
export function appAllowed(userApps: string[] | null | undefined, required: readonly string[]): boolean {
  return required.length === 0 || required.some((a) => canUseApp(userApps, a));
}

@Injectable()
export class AppAccessGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UniverseAppKey[] | undefined>(KEY, [ctx.getHandler(), ctx.getClass()]) ?? [];
    if (required.length === 0) return true;
    const user = ctx.switchToHttp().getRequest<Request & { user?: RequestUser }>().user;
    if (!user) throw new ForbiddenException("Sign in to continue.");
    if (appAllowed(user.apps, required)) return true;
    const names = required.map((a) => UNIVERSE_APP_LABELS[a]).join(" or ");
    throw new ForbiddenException(`You have not been given access to ${names}. Ask your organisation's administrator.`);
  }
}
