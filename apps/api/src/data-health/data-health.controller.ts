import { Controller, Get, Query } from "@nestjs/common";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { DataHealthService } from "./data-health.service";

@Controller("data-health")
export class DataHealthController {
  constructor(private readonly health: DataHealthService) {}
  /** What each app your organisation can use is being fed less than it could be, with a link to fix each. `app` limits it to one app. */
  @Get() sections(@CurrentUser() user: RequestUser, @Query("app") app?: string) { return this.health.sections(user, app); }
}
