import { Module } from "@nestjs/common";
import { ProjectsModule } from "./projects/projects.module";
import { UsersModule } from "./users/users.module";
import { RolesModule } from "./roles/roles.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { SupplierDirectoryModule } from "./supplier-directory/supplier-directory.module";
import { TendersModule } from "./tenders/tenders.module";
import { PharmaReferenceModule } from "./pharma-reference/pharma-reference.module";
import { ServiceCatalogueModule } from "./service-catalogue/service-catalogue.module";
import { MeController } from "./me/me.controller";
import { PartnersModule } from "./partners/partners.module";
import { SupplierEnquiriesModule } from "./supplier-enquiries/supplier-enquiries.module";
import { DocumentsModule } from "./documents/documents.module";
import { QualityModule } from "./quality/quality.module";
import { RetentionModule } from "./retention/retention.module";
import { GeoModule } from "./geo/geo.module";
import { StakeholderRegistryModule } from "./stakeholder-registry/stakeholder-registry.module";
import { ProductCatalogModule } from "./product-catalog/product-catalog.module";
import { RiskAssessmentsModule } from "./risk-assessments/risk-assessments.module";
import { AuditLogModule } from "./audit-log/audit-log.module";
import { EvidenceModule } from "./evidence/evidence.module";
import { ControlledDocumentsModule } from "./controlled-documents/controlled-documents.module";
import { ProductBatchesModule } from "./batches/product-batches.module";
import { LogisticsInsightsModule } from "./logistics-insights/logistics-insights.module";
import { InsightsModule } from "./insights/insights.module";
import { ProductSourcingInsightsModule } from "./product-sourcing-insights/product-sourcing-insights.module";
import { CrmModule } from "./crm/crm.module";
import { DataHealthModule } from "./data-health/data-health.module";
import { ContactsModule } from "./contacts/contacts.module";
import { BrandingModule } from "./branding/branding.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { StakeholderAccessModule } from "./stakeholder-access/stakeholder-access.module";
import { SearchModule } from "./search/search.module";
import { DataExportsModule } from "./data-exports/data-exports.module";

@Module({
  imports: [
    ProjectsModule,
    UsersModule,
    RolesModule,
    OrganizationsModule,
    SupplierDirectoryModule,
    TendersModule,
    PharmaReferenceModule,
    ServiceCatalogueModule,
    PartnersModule,
    SupplierEnquiriesModule,
    DocumentsModule,
    QualityModule,
    RetentionModule,
    GeoModule,
    StakeholderRegistryModule,
    ProductCatalogModule,
    RiskAssessmentsModule,
    AuditLogModule,
    EvidenceModule,
    ControlledDocumentsModule,
    ProductBatchesModule,
    LogisticsInsightsModule,
    ProductSourcingInsightsModule,
    InsightsModule,
    ContactsModule,
    CrmModule,
    DataHealthModule,
    BrandingModule,
    NotificationsModule,
    SearchModule, StakeholderAccessModule, DataExportsModule,
  ],
  controllers: [MeController],
})
export class AppModule {}
