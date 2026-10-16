import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { SearchService } from "./search.service";

@Controller("search")
@UseGuards(EntraAuthGuard)
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  find(@CurrentUser() user: RequestUser, @Query("q") q?: string) {
    return this.search.search(user, q ?? "");
  }
}
