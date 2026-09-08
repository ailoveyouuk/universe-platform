import { Controller, Get, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";

/**
 * Lets a frontend app find out who's signed in and what they can do —
 * used by the Admin app to decide whether to show the organization picker
 * (platform staff) or lock the invite form to the caller's own org.
 */
@Controller("me")
@UseGuards(EntraAuthGuard)
export class MeController {
  @Get()
  me(@CurrentUser() user: RequestUser) {
    return user;
  }
}
