import { IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator";

/**
 * Admin app "edit organisation" (added 2026-10-16). Every field optional;
 * `undefined` = untouched, explicit `null` = clear the value (only legal for
 * nullable columns — name/slug/status reject null in OrganizationsService).
 *
 * Which fields a given caller may actually change is decided in the service
 * (PLATFORM_ONLY_FIELDS vs ORG_EDITABLE_FIELDS), not here — this class only
 * validates shape.
 */
export class UpdateOrganizationDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;

  @IsOptional()
  @Matches(/^[a-z0-9-]+$/, { message: "slug must be lowercase letters, numbers, and hyphens only" })
  slug?: string;

  @IsOptional() @IsIn(["PILOT", "ACTIVE", "SUSPENDED"]) status?: string;

  @IsOptional() @IsBoolean() shareIdentityWithUniverse?: boolean;

  /** Other roles the organisation also holds (an organisation may be, say, a supplier and a procurement agent). */
  @IsOptional() @IsArray() @IsIn(["PROCUREMENT_SERVICE_AGENT", "TENDERING_PURCHASING_BODY", "MANUFACTURER", "SUPPLIER", "FUNDER_DONOR", "DATA_INSIGHTS_USER"], { each: true }) additionalTypes?: string[];

  @IsOptional() @IsString() @MaxLength(200) legalName?: string | null;
  @IsOptional()
  @IsIn(["GOVERNMENT_AGENCY", "PRIVATE_COMPANY", "REGISTERED_NGO", "FAITH_BASED_NETWORK", "MULTILATERAL_UN_BODY", "COOPERATIVE", "ACADEMIC_INSTITUTION", "INDIVIDUAL", "OTHER"])
  legalEntityType?: string | null;
  @IsOptional() @IsString() @MaxLength(10) countryOfRegistrationCode?: string | null;
  @IsOptional() @IsString() @MaxLength(100) registrationNumber?: string | null;
  @IsOptional() @IsString() @MaxLength(300) website?: string | null;

  @IsOptional() @IsString() @MaxLength(200) primaryContactName?: string | null;
  @IsOptional() @IsString() @MaxLength(200) primaryContactTitle?: string | null;
  @IsOptional() @IsEmail() primaryContactEmail?: string | null;
  @IsOptional() @IsString() @MaxLength(50) primaryContactPhone?: string | null;

  @IsOptional() @IsString() @MaxLength(1000) logoUrl?: string | null;
  @IsOptional() @Matches(/^#[0-9A-Fa-f]{6}$/, { message: "primaryColor must be a #RRGGBB hex colour" }) primaryColor?: string | null;
  @IsOptional() @Matches(/^#[0-9A-Fa-f]{6}$/, { message: "secondaryColor must be a #RRGGBB hex colour" }) secondaryColor?: string | null;

  @IsOptional()
  @IsIn(["SELF_REFERRED", "INVITED_BY_PROCUREMENT_AGENT", "INVITED_BY_FUNDER", "PLATFORM_STAFF_OUTREACH", "OTHER"])
  onboardingSource?: string | null;
  @IsOptional() @IsString() @MaxLength(200) welcomeMessage?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) notes?: string | null;
}
