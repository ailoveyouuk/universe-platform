import { Module } from "@nestjs/common";
import { ProjectsModule } from "./projects/projects.module";
import { UsersModule } from "./users/users.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { SupplierDirectoryModule } from "./supplier-directory/supplier-directory.module";
import { MeController } from "./me/me.controller";
import { PartnersModule } from "./partners/partners.module";

@Module({
  imports: [ProjectsModule, UsersModule, OrganizationsModule, SupplierDirectoryModule, PartnersModule],
  controllers: [MeController],
})
export class AppModule {}
