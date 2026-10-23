import { Module } from "@nestjs/common";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationAccessService } from "./organization-access.service";
import { BlobStorageService } from "../documents/blob-storage.service";
import { OrgScopeCertsService } from "./org-scope-certs.service";
import { OrganizationsService } from "./organizations.service";

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationAccessService, OrgScopeCertsService, BlobStorageService],
})
export class OrganizationsModule {}
