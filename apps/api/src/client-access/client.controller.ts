import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { ClientService } from "./client.service";
import type { ClientComplaintInput, ClientInviteInput } from "@universe/types";

/** /client/* is what a client login may reach; /client-access/* is the organisation administrator's side. */
@Controller()
@UseGuards(EntraAuthGuard)
export class ClientController {
  constructor(private readonly client: ClientService) {}
  @Get("client/complaints") list(@CurrentUser() u: RequestUser) { return this.client.list(u); }
  @Get("client/complaints/:id") detail(@CurrentUser() u: RequestUser, @Param("id") id: string) { return this.client.detail(u, id); }
  @Post("client/complaints") log(@CurrentUser() u: RequestUser, @Body() dto: ClientComplaintInput) { return this.client.log(u, dto); }
  @Post("client/complaints/:id/messages") message(@CurrentUser() u: RequestUser, @Param("id") id: string, @Body() b: { text: string }) { return this.client.message(u, id, b?.text); }
  @Get("client-access/users") clients(@CurrentUser() u: RequestUser) { return this.client.clients(u); }
  @Post("client-access/users") invite(@CurrentUser() u: RequestUser, @Body() dto: ClientInviteInput) { return this.client.invite(u, dto); }
}
