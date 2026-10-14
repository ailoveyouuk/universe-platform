import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString } from "class-validator";

/**
 * DTOs for the five org-type detail tables wired up 2026-10-14 (see
 * backend-frontend-wiring-audit.md's dead-schema findings) — one per
 * Organization.type, @@unique on organizationId except
 * OrganizationManufacturerSite which is one-to-many (see its own DTOs
 * below). List-shaped fields arrive here as real string[] and are
 * JSON.stringify'd in OrganizationsService before writing to the
 * NVarChar(Max) columns — see each model's own schema.prisma doc comment
 * ("JSON string array") for why the column itself is a string, not a
 * normalized child table: none of these are filtered/searched on yet.
 *
 * Enum fields (logisticsCapability, bodyType, institutionType) are
 * validated against the exact allowed-values list schema.prisma keeps at
 * its own top-of-file reference comment — see lines ~120-165 there for
 * the authoritative list if this ever needs extending.
 */

export class UpsertProcurementAgentProfileDto {
  @IsOptional() @IsArray() @IsString({ each: true }) fundersProgramsOperatedUnder?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) productCategoriesProcured?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) clientTypesServed?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) accreditations?: string[];
  @IsOptional() @IsIn(["OWN", "SUBCONTRACTED", "MIXED"]) logisticsCapability?: string;
  @IsOptional() @IsInt() yearsOperatingInRole?: number;
  @IsOptional() @IsString() insuranceCoverSummary?: string;
  @IsOptional() @IsDateString() insuranceExpiryDate?: string;
  @IsOptional() @IsString() trackRecordSummary?: string;
}

export class UpsertTenderingBodyProfileDto {
  @IsOptional() @IsIn(["GOVERNMENT", "FAITH_BASED_NETWORK", "NGO_IMPLEMENTING_PARTNER", "MULTILATERAL"]) bodyType?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) fundingSources?: string[];
  @IsOptional() @IsBoolean() hasDirectProcurementAuthority?: boolean;
  @IsOptional() @IsBoolean() usesExternalProcurementAgent?: boolean;
  @IsOptional() @IsString() procurementAgentOrganizationId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) diseaseProgramAreas?: string[];
  @IsOptional() @IsString() scaleServedSummary?: string;
}

export class UpsertFunderProfileDto {
  @IsOptional() @IsArray() @IsString({ each: true }) fundingFocusAreas?: string[];
  @IsOptional() @IsString() notes?: string;
}

export class UpsertDataInsightsUserProfileDto {
  @IsOptional()
  @IsIn(["ACADEMIC", "NGO_NONPROFIT_RESEARCH", "MULTILATERAL_MARKET_INTELLIGENCE", "COMMERCIAL_MARKET_INTELLIGENCE", "INDIVIDUAL_RESEARCHER"])
  institutionType?: string;
  @IsOptional() @IsString() affiliatedInstitution?: string;
  @IsOptional() @IsString() purposeIntendedUse?: string;
  @IsOptional() @IsString() publicationIntent?: string;
  @IsOptional() @IsString() fundingSourceOfResearch?: string;
  @IsOptional() @IsString() dataUseAgreementVersion?: string;
  @IsOptional() @IsDateString() dataUseAgreementAcceptedAt?: string;
}

/** OrganizationManufacturerSite is one-to-many (a manufacturer can have
 * several sites, each independently certified) — add/remove rather than
 * a single upsert, same shape decision as
 * SupplierDirectoryService.createProduct/removeProduct for the other
 * one-to-many marketplace table. */
export class AddManufacturerSiteDto {
  @IsOptional() @IsString() locationCountryCode?: string;
  @IsOptional() @IsString() locationDetail?: string;
  @IsOptional() @IsBoolean() gmpCertified?: boolean;
  @IsOptional() @IsString() gmpCertificationDetail?: string;
}
