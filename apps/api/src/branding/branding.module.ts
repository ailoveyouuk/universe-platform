import { Module } from "@nestjs/common";
import { BlobStorageService } from "../documents/blob-storage.service";
import { BrandingController } from "./branding.controller";
import { BrandingService } from "./branding.service";

@Module({
  controllers: [BrandingController],
  providers: [BrandingService, BlobStorageService],
})
export class BrandingModule {}
