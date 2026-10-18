import { Module } from "@nestjs/common";
import { DataExportsController } from "./data-exports.controller";
import { OrganisationExportsService } from "./organisation-exports.service";

@Module({ controllers: [DataExportsController], providers: [OrganisationExportsService] })
export class DataExportsModule {}
