import { Module } from "@nestjs/common";
import { PharmaReferenceController } from "./pharma-reference.controller";
import { PharmaReferenceService } from "./pharma-reference.service";

@Module({ controllers: [PharmaReferenceController], providers: [PharmaReferenceService] })
export class PharmaReferenceModule {}
