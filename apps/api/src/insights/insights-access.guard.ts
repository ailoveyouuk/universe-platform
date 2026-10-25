import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { canUseApp } from "@universe/types";
import type { Request } from "express";
import type { RequestUser } from "../auth/entra-auth.guard";

/** Insights is an app people are given (Admin > Users > Apps). Runs after EntraAuthGuard. Platform staff are never restricted. */
@Injectable()
export class InsightsAccessGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest<Request & { user?: RequestUser }>().user;
    if (!user || !canUseApp(user.apps, "insights")) throw new ForbiddenException("You have not been given access to Insights. Ask your organisation's administrator.");
    return true;
  }
}
