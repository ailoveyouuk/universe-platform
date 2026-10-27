import { Module } from "@nestjs/common";
import { DocumentsModule } from "../documents/documents.module";
import { ExchangeRatesModule } from "../exchange-rates/exchange-rates.module";
import { QualityModule } from "../quality/quality.module";
import { CrmHospitalityService } from "./crm-hospitality.service";
import { CrmController } from "./crm.controller";
import { CrmInteractionsService } from "./crm-interactions.service";
import { CrmOpportunitiesService } from "./crm-opportunities.service";
import { CrmSavedFiltersService } from "./crm-saved-filters.service";
import { CrmTagsService } from "./crm-tags.service";
import { CrmPlacesService } from "./crm-places.service";
import { CrmNetworkService } from "./crm-network.service";
import { CrmTreeService } from "./crm-tree.service";
import { CrmCategoryService } from "./crm-category.service";
import { CrmPrivacyService } from "./crm-privacy.service";
import { CrmExportService } from "./crm-export.service";
import { CrmSearchService } from "./crm-search.service";
import { CrmService } from "./crm.service";

@Module({
  imports: [QualityModule, DocumentsModule, ExchangeRatesModule], controllers: [CrmController], providers: [CrmService, CrmExportService, CrmSearchService, CrmInteractionsService, CrmPrivacyService, CrmOpportunitiesService, CrmTagsService, CrmSavedFiltersService, CrmPlacesService, CrmHospitalityService, CrmNetworkService, CrmCategoryService, CrmTreeService], exports: [CrmService] })
export class CrmModule {}
