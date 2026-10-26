import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AppAccessGuard, RequiresApp } from "../common/app-access.guard";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { ContactsService } from "./contacts.service";

@Controller("contacts")
@UseGuards(EntraAuthGuard, AppAccessGuard)
@RequiresApp("project-management")
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser, @Query("q") q?: string, @Query("limit") limit?: string) {
    return this.contactsService.findAll(user, q, limit ? Number(limit) : undefined);
  }
}
