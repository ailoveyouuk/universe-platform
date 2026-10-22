import { Controller, Get, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { SupplierPortalService } from "./supplier-portal.service";

@Controller("supplier-portal")
@UseGuards(EntraAuthGuard)
export class SupplierPortalController {
  constructor(private readonly portal: SupplierPortalService) {}
  @Get("dashboard") dashboard(@CurrentUser() u: RequestUser) { return this.portal.dashboard(u); }
}
