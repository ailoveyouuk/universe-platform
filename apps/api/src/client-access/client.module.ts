import { Module } from "@nestjs/common";
import { QualityModule } from "../quality/quality.module";
import { ClientController } from "./client.controller";
import { ClientService } from "./client.service";

@Module({ imports: [QualityModule], controllers: [ClientController], providers: [ClientService] })
export class ClientModule {}
