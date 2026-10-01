import { Module } from "@nestjs/common";
import { ProjectsModule } from "../projects/projects.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { BlobStorageService } from "./blob-storage.service";

@Module({
  imports: [ProjectsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, BlobStorageService],
})
export class DocumentsModule {}
