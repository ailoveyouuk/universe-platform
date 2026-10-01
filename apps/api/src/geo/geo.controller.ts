import { Controller, Get, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { GeoService } from "./geo.service";

@Controller("countries")
@UseGuards(EntraAuthGuard)
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get()
  listCountries() {
    return this.geoService.listCountries();
  }
}
