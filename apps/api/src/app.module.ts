import { Module } from "@nestjs/common";
import { ProjectsModule } from "./projects/projects.module";
import { UsersModule } from "./users/users.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { MeController } from "./me/me.controller";

@Module({
  imports: [ProjectsModule, UsersModule, OrganizationsModule],
  controllers: [MeController],
})
export class AppModule {}
