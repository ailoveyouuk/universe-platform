import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { EmailService } from "./email.service";
import type { EmailRecipientInput } from "@universe/types";

@Controller("email")
@UseGuards(EntraAuthGuard)
export class EmailController {
  constructor(private readonly email: EmailService) {}
  @Get("rules") view(@CurrentUser() u: RequestUser) { return this.email.view(u); }
  @Get("people") people(@CurrentUser() u: RequestUser, @Query("q") q: string) { return this.email.people(u, q); }
  @Post("recipients") add(@CurrentUser() u: RequestUser, @Body() dto: EmailRecipientInput) { return this.email.add(u, dto); }
  @Delete("recipients/:id") remove(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.email.remove(u, id); }
}
