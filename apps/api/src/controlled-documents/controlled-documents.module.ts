import { Module } from "@nestjs/common";
import { ControlledDocumentsController } from "./controlled-documents.controller";
import { ControlledDocumentsService } from "./controlled-documents.service";

@Module({
  controllers: [ControlledDocumentsController],
  providers: [ControlledDocumentsService],
})
export class ControlledDocumentsModule {}
