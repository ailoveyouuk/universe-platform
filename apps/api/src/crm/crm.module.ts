import { Module } from "@nestjs/common";
import { QualityModule } from "../quality/quality.module";
import { CrmController } from "./crm.controller";
import { CrmInteractionsService } from "./crm-interactions.service";
import { CrmOpportunitiesService } from "./crm-opportunities.service";
import { CrmSavedFiltersService } from "./crm-saved-filters.service";
import { CrmTagsService } from "./crm-tags.service";
import { CrmPlacesService } from "./crm-places.service";
import { CrmPrivacyService } from "./crm-privacy.service";
import { CrmService } from "./crm.service";

@Module({
  imports: [QualityModule], controllers: [CrmController], providers: [CrmService, CrmInteractionsService, CrmPrivacyService, CrmOpportunitiesService, CrmTagsService, CrmSavedFiltersService, CrmPlacesService], exports: [CrmService] })
export class CrmModule {}
