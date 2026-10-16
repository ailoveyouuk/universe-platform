import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { NotificationsService } from "./notifications.service";

/** The signed-in user's own notifications and actions. No extra permission:
 * everything is pinned to the caller, so there is nothing to over-grant. */
@Controller("notifications")
@UseGuards(EntraAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: RequestUser, @Query("filter") filter?: string, @Query("limit") limit?: string) {
    const f = filter === "unread" || filter === "actions" || filter === "done" ? filter : "all";
    return this.notifications.list(user, f, limit ? parseInt(limit, 10) || 50 : 50);
  }

  // Static routes before ":id" so they are not swallowed by it.
  @Get("summary")
  summary(@CurrentUser() user: RequestUser) {
    return this.notifications.summary(user);
  }

  @Post("read-all")
  readAll(@CurrentUser() user: RequestUser) {
    return this.notifications.markAllRead(user);
  }

  @Post(":id/read")
  read(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.notifications.markRead(user, id);
  }

  @Post(":id/complete")
  complete(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.notifications.complete(user, id);
  }

  @Post(":id/reopen")
  reopen(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.notifications.reopen(user, id);
  }
}
