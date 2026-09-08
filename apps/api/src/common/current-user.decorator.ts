import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { RequestUser } from "../auth/entra-auth.guard";

/**
 * Pulls the authenticated, tenant-resolved user off the request — set by
 * EntraAuthGuard. Use this in controllers instead of reaching into the
 * request directly, so there's exactly one place that knows the shape.
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestUser => {
  const req = ctx.switchToHttp().getRequest<Request & { user: RequestUser }>();
  return req.user;
});
