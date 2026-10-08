import { Controller, Get, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { ContactsService } from "./contacts.service";

@Controller("contacts")
@UseGuards(EntraAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser) {
    return this.contactsService.findAll(user);
  }
}
