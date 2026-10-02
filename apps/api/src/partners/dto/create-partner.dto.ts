import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

const ROLE_TYPES = ["CLIENT", "MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "WAREHOUSING", "LOGISTICS"] as const;
const RISK_TIERS = ["HIGH", "MEDIUM", "LOW"] as const;
const CERTIFICATION_STATUSES = ["CURRENT", "ARCHIVED"] as const;
const COMPANY_CHECK_RESULTS = ["YES", "NO", "NOT_APPLICABLE"] as const;

/**
 * One generic document/certificate row — see PartnerCertification's doc
 * comment in schema.prisma (expanded 2026-10-02 after reviewing the real
 * Becton Dickinson supplier folder and Bioconnections' own New Supplier
 * form, FORM 008.1). `type` is free-text validated at the app layer
 * against CertificationType in packages/db/src/enums.ts, same convention
 * as every other SQL-Server-can't-do-enums field in this schema.
 */
export class PartnerCertificationDto {
  @IsString() type!: string;
  @IsOptional() @IsString() referenceNumber?: string;
  @IsOptional() @IsString() revision?: string;
  @IsOptional() @IsString() issuingBody?: string;
  @IsOptional() @IsDateString() issuedDate?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsDateString() verifiedAt?: string;
  @IsOptional() @IsIn(CERTIFICATION_STATUSES) status?: (typeof CERTIFICATION_STATUSES)[number];
  @IsOptional() @IsString() notes?: string;
  /** Index into this request's `manufacturerSites` array — resolved to the
   * real site id server-side once the sites are created in the same
   * transaction. Omit for a company-wide (not site-specific) document. */
  @IsOptional() @IsNumber() manufacturerSiteIndex?: number;
  /** Optionally relates this document to a specific company check (e.g. a
   * VAT Certificate upload attached to the "VAT Certificate" check) — the
   * checkType string itself, same free-text join-key convention as `type`
   * above. See PartnerCertification.relatedCompanyCheckType's doc comment
   * in schema.prisma. */
  @IsOptional() @IsString() relatedCompanyCheckType?: string;
}

/** Bioconnections FORM 008.1's "Company Checks" table (Companies House,
 * VAT, Website, Financial Credit Status, Location, Business Insurance) —
 * see PartnerCompanyCheck's doc comment in schema.prisma. */
export class PartnerCompanyCheckDto {
  @IsString() checkType!: string;
  /** Only meaningful when checkType is "OTHER" — see
   * PartnerCompanyCheck.customLabel's doc comment in schema.prisma. */
  @IsOptional() @IsString() customLabel?: string;
  @IsIn(COMPANY_CHECK_RESULTS) result!: (typeof COMPANY_CHECK_RESULTS)[number];
  @IsOptional() @IsDateString() checkedDate?: string;
  @IsOptional() @IsString() referenceOrSource?: string;
  @IsOptional() @IsString() comment?: string;
}

/** A manufacturer's registered manufacturing site — see ManufacturerSite's
 * doc comment in schema.prisma (the Becton Dickinson folder pattern: one
 * ISO 13485 certificate per site). */
export class ManufacturerSiteDto {
  @IsString() siteName!: string;
  @IsOptional() @IsString() countryCode?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
}

export class SupplierDetailDto {
  @IsOptional() @IsString() supplierCode?: string;
  @IsOptional() @IsString() productCategory?: string;
  @IsOptional() @IsString() fdaRegistrationNumber?: string;
  @IsOptional() @IsString() scopeOfSupply?: string;
  @IsOptional() @IsString() scopeOfServicesDescription?: string;
  @IsOptional() @IsBoolean() codeOfConductAcknowledged?: boolean;
  @IsOptional() @IsDateString() codeOfConductAcknowledgedDate?: string;
}

export class ManufacturerDetailDto {
  @IsOptional() @IsString() partNumberConvention?: string;
  @IsOptional() @IsString() countryOfManufactureCode?: string;
  @IsOptional() @IsString() scopeOfSupply?: string;
  @IsOptional() @IsString() scopeOfServicesDescription?: string;
}

export class FreightForwarderDetailDto {
  @IsOptional() @IsString() modesOfTransport?: string;
  @IsOptional() @IsBoolean() iataDgrCertified?: boolean;
  @IsOptional() @IsBoolean() aeoAccredited?: boolean;
  @IsOptional() @IsBoolean() gdpTransportCapable?: boolean;
  @IsOptional() @IsBoolean() referencesProvided?: boolean;
}

export class ClientDetailDto {
  @IsOptional() @IsString() billingAddress?: string;
  @IsOptional() @IsString() deliveryAddress?: string;
  @IsOptional() @IsString() paymentTerms?: string;
  @IsOptional() @IsString() productCategoryLicensingNotes?: string;
  @IsOptional() @IsString() destinationCountryRestrictionsNotes?: string;
  @IsOptional() @IsBoolean() isPharmaApprovedCustomer?: boolean;
  @IsOptional() @IsString() approvedCustomerLogRef?: string;
}

/** Added 2026-10-02 — Warehousing didn't have its own detail object
 * before; see WarehousingDetail's doc comment in schema.prisma (SOP029
 * Managing Outsourced Warehousing). */
export class WarehousingDetailDto {
  @IsOptional() @IsString() wdaNumber?: string;
  @IsOptional() @IsString() technicalAgreementRef?: string;
  @IsOptional() @IsDateString() gdpAuditDate?: string;
  @IsOptional() @IsDateString() nextGdpAuditDue?: string;
  @IsOptional() @IsString() monthlyReconciliationContact?: string;
}

/**
 * A Partner is a real-world company a tenant does business with (client,
 * supplier, manufacturer, freight forwarder), scoped to the caller's own
 * organization — see PartnersService and the naming note at the top of
 * schema.prisma (Partner vs. Organization). Created with at least one role;
 * role-specific detail objects are optional and only meaningful for the
 * matching role (a SUPPLIER role can carry supplierDetail, etc. — the
 * service doesn't cross-check that they match, it's just organized this
 * way for a sane form UX).
 *
 * Expanded 2026-10-02 (architecture-decisions.md, "Stakeholder onboarding
 * expansion") with risk tiering, company identifiers,
 * manufacturer sites, and the generic certifications/company-checks lists
 * that back the New Stakeholder form's per-role document sections.
 */
export class CreatePartnerDto {
  @IsString() name!: string;
  @IsOptional() @IsString() countryCode?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsIn(RISK_TIERS) riskTier?: (typeof RISK_TIERS)[number];
  @IsOptional() @IsString() companyRegistrationNumber?: string;
  @IsOptional() @IsString() vatNumber?: string;
  /** Set when the caller has already confirmed a match against the
   * stakeholder registry (the duplicate-prevention prompt's "add and link"
   * action) — see PartnersService.create and StakeholderRegistryService.
   * Omit to let the server run its own matching (creates a fresh registry
   * entry if nothing plausible is found). */
  @IsOptional() @IsString() registryEntryId?: string;

  /** Reserved for a future consent covering relationship-specific data
   * (e.g. pricing) shared with the specific organization that created this
   * record — see Partner.sharedWithUniverseRegistry's doc comment in
   * schema.prisma. Does NOT gate identity-level registry matching: that
   * runs unconditionally for every Partner regardless of this flag. */
  @IsOptional() @IsBoolean() sharedWithUniverseRegistry?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(ROLE_TYPES, { each: true })
  roleTypes!: (typeof ROLE_TYPES)[number][];

  @IsOptional() @ValidateNested() @Type(() => SupplierDetailDto) supplierDetail?: SupplierDetailDto;
  @IsOptional() @ValidateNested() @Type(() => ManufacturerDetailDto) manufacturerDetail?: ManufacturerDetailDto;
  @IsOptional() @ValidateNested() @Type(() => FreightForwarderDetailDto) freightForwarderDetail?: FreightForwarderDetailDto;
  @IsOptional() @ValidateNested() @Type(() => ClientDetailDto) clientDetail?: ClientDetailDto;
  @IsOptional() @ValidateNested() @Type(() => WarehousingDetailDto) warehousingDetail?: WarehousingDetailDto;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ManufacturerSiteDto)
  manufacturerSites?: ManufacturerSiteDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PartnerCertificationDto)
  certifications?: PartnerCertificationDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PartnerCompanyCheckDto)
  companyChecks?: PartnerCompanyCheckDto[];
}
