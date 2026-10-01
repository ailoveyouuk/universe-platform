import { Module } from "@nestjs/common";
import { ProjectsModule } from "./projects/projects.module";
import { UsersModule } from "./users/users.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { SupplierDirectoryModule } from "./supplier-directory/supplier-directory.module";
import { MeController } from "./me/me.controller";
import { PartnersModule } from "./partners/partners.module";
import { SupplierEnquiriesModule } from "./supplier-enquiries/supplier-enquiries.module";
import { DocumentsModule } from "./documents/documents.module";
import { QualityModule } from "./quality/quality.module";
import { GeoModule } from "./geo/geo.module";

@Module({
  imports: [ProjectsModule, UsersModule, OrganizationsModule, SupplierDirectoryModule, PartnersModule, SupplierEnquiriesModule, DocumentsModule, QualityModule, GeoModule],
  controllers: [MeController],
})
export class AppModule {}
