/**
 * Canonical allowed-value lists for every field that used to be a native
 * Prisma `enum` (see the top of prisma/schema.prisma for why: Prisma does
 * not support enums on the SQL Server connector at all). These are `String`
 * columns in the database now, validated and referenced here instead.
 *
 * Each export mirrors the shape of a Prisma-generated enum object (e.g.
 * `UserStatus.INVITED === "INVITED"`) so existing call sites that did
 * `import { UserStatus } from "@universe/db"` and used `UserStatus.INVITED`
 * keep working unchanged — only the source of that object moved.
 */

export const ProjectCategory = {
  PROCUREMENT: "PROCUREMENT",
  TECHNICAL_ASSISTANCE: "TECHNICAL_ASSISTANCE",
} as const;
export type ProjectCategory = (typeof ProjectCategory)[keyof typeof ProjectCategory];

export const ProjectType = {
  PHARMACEUTICAL: "PHARMACEUTICAL",
  NON_PHARMACEUTICAL: "NON_PHARMACEUTICAL",
} as const;
export type ProjectType = (typeof ProjectType)[keyof typeof ProjectType];

export const ProjectStatus = {
  IDENTIFIED: "IDENTIFIED",
  IN_PROGRESS: "IN_PROGRESS",
  SUBMITTED: "SUBMITTED",
  AWARDED: "AWARDED",
  COMPLETED: "COMPLETED",
  UNAWARDED: "UNAWARDED",
  DECLINED: "DECLINED",
  CANCELLED: "CANCELLED",
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const Incoterm = {
  EXW: "EXW",
  FCA: "FCA",
  FAS: "FAS",
  FOB: "FOB",
  CPT: "CPT",
  CIP: "CIP",
  CFR: "CFR",
  CIF: "CIF",
  DAP: "DAP",
  DPU: "DPU",
  DDP: "DDP",
} as const;
export type Incoterm = (typeof Incoterm)[keyof typeof Incoterm];

export const FreightMode = {
  AIR: "AIR",
  SEA: "SEA",
  LAND: "LAND",
} as const;
export type FreightMode = (typeof FreightMode)[keyof typeof FreightMode];

export const ProductCategory = {
  CONSUMABLES: "CONSUMABLES",
  DEVICES: "DEVICES",
  REAGENTS: "REAGENTS",
  EQUIPMENT: "EQUIPMENT",
  PHARMACEUTICALS: "PHARMACEUTICALS",
  LABORATORY: "LABORATORY",
} as const;
export type ProductCategory = (typeof ProductCategory)[keyof typeof ProductCategory];

export const ProjectDocumentType = {
  CHECKLIST: "CHECKLIST",
  ISSUES: "ISSUES",
  CLOSEOUT_REPORT: "CLOSEOUT_REPORT",
  OTHER: "OTHER",
} as const;
export type ProjectDocumentType = (typeof ProjectDocumentType)[keyof typeof ProjectDocumentType];

export const OrganizationStatus = {
  PILOT: "PILOT",
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;
export type OrganizationStatus = (typeof OrganizationStatus)[keyof typeof OrganizationStatus];

/// Expanded 2026-09-26 from the original BUYER|SUPPLIER pair — see
/// Organization.type's doc comment in schema.prisma and
/// claude/stakeholder-taxonomy-research.md in the Claude project for the
/// real-world taxonomy this maps to. PROCUREMENT_SERVICE_AGENT is the
/// renamed former BUYER value (no data migration ambiguity — Unimed, the
/// only org provisioned so far, is a textbook procurement service agent).
export const OrganizationType = {
  PROCUREMENT_SERVICE_AGENT: "PROCUREMENT_SERVICE_AGENT",
  TENDERING_PURCHASING_BODY: "TENDERING_PURCHASING_BODY",
  MANUFACTURER: "MANUFACTURER",
  SUPPLIER: "SUPPLIER",
  FUNDER_DONOR: "FUNDER_DONOR",
  DATA_INSIGHTS_USER: "DATA_INSIGHTS_USER",
} as const;
export type OrganizationType = (typeof OrganizationType)[keyof typeof OrganizationType];

export const PlatformStaffRole = {
  NONE: "NONE",
  SUPPORT: "SUPPORT",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;
export type PlatformStaffRole = (typeof PlatformStaffRole)[keyof typeof PlatformStaffRole];

export const UserStatus = {
  INVITED: "INVITED",
  ACTIVE: "ACTIVE",
  DEACTIVATED: "DEACTIVATED",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

// --- Added 2026-09-24, schema rework (Partners, ProjectLine, ProductMaster) ---

export const PartnerRoleType = {
  CLIENT: "CLIENT",
  MANUFACTURER: "MANUFACTURER",
  SUPPLIER: "SUPPLIER",
  FREIGHT_FORWARDER: "FREIGHT_FORWARDER",
  WAREHOUSING: "WAREHOUSING",
  LOGISTICS: "LOGISTICS",
} as const;
export type PartnerRoleType = (typeof PartnerRoleType)[keyof typeof PartnerRoleType];

export const PartnerApprovalStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REMOVED: "REMOVED",
} as const;
export type PartnerApprovalStatus = (typeof PartnerApprovalStatus)[keyof typeof PartnerApprovalStatus];

/// Expanded 2026-10-02 after the SOP008/Bioconnections FORM 008.1/BD-folder
/// research pass (architecture doc, "Stakeholder onboarding: SOP-aligned
/// expansion") — covers every document type actually observed in Unimed's
/// real supplier files, not just the original four.
export const CertificationType = {
  ISO_13485: "ISO_13485",
  ISO_9001: "ISO_9001",
  ISO_14001: "ISO_14001",
  ISO_17025: "ISO_17025",
  OTHER_ISO: "OTHER_ISO",
  FDA_REGISTRATION: "FDA_REGISTRATION",
  GMP: "GMP",
  GDP: "GDP",
  MIA: "MIA",
  WDA: "WDA",
  /// EU device-registration-database check (BD folder: "verification
  /// EUDAMED registration").
  EUDAMED_REGISTRATION: "EUDAMED_REGISTRATION",
  CE_MDR_CERTIFICATE: "CE_MDR_CERTIFICATE",
  DECLARATION_OF_CONFORMITY: "DECLARATION_OF_CONFORMITY",
  /// In-country device registration (BD folder: Kenya device registration,
  /// Tanzania TMDA) — track one per destination country, not one per
  /// manufacturer.
  DEVICE_REGISTRATION: "DEVICE_REGISTRATION",
  INSTRUCTIONS_FOR_USE: "INSTRUCTIONS_FOR_USE",
  TECHNICAL_INFORMATION_SHEET: "TECHNICAL_INFORMATION_SHEET",
  COMPANY_REGISTRATION: "COMPANY_REGISTRATION",
  VAT_CERTIFICATE: "VAT_CERTIFICATE",
  FINANCIAL_CREDIT_CHECK: "FINANCIAL_CREDIT_CHECK",
  BUSINESS_INSURANCE: "BUSINESS_INSURANCE",
  /// IATA Dangerous Goods Regulations handling certification — freight
  /// forwarder.
  IATA_DGR_CERTIFICATION: "IATA_DGR_CERTIFICATION",
  AEO_ACCREDITATION: "AEO_ACCREDITATION",
  INSURANCE_CERTIFICATE: "INSURANCE_CERTIFICATE",
  TECHNICAL_AGREEMENT: "TECHNICAL_AGREEMENT",
  SERVICE_LEVEL_AGREEMENT: "SERVICE_LEVEL_AGREEMENT",
  /// SOP008 §4.1.12: Unimed's Code of Conduct, sent to every approved
  /// supplier for "Read & Understood" acknowledgement, copy retained.
  CODE_OF_CONDUCT_ACKNOWLEDGEMENT: "CODE_OF_CONDUCT_ACKNOWLEDGEMENT",
  REFERENCES: "REFERENCES",
  /// SOP008 §4.7.1: FORM 008.2, the annual Bona Fide re-check record for
  /// approved pharmaceutical (and GDP-impacting outsourced) suppliers.
  BONA_FIDE_REVIEW: "BONA_FIDE_REVIEW",
  OTHER: "OTHER",
} as const;
export type CertificationType = (typeof CertificationType)[keyof typeof CertificationType];

/// Added 2026-10-02 — see PartnerCertification.status in schema.prisma.
export const PartnerCertificationStatus = {
  CURRENT: "CURRENT",
  ARCHIVED: "ARCHIVED",
} as const;
export type PartnerCertificationStatus =
  (typeof PartnerCertificationStatus)[keyof typeof PartnerCertificationStatus];

/// Added 2026-10-02 from Bioconnections FORM 008.1's "Company Checks"
/// table — see PartnerCompanyCheck in schema.prisma.
export const PartnerCompanyCheckType = {
  COMPANIES_HOUSE_REGISTRATION: "COMPANIES_HOUSE_REGISTRATION",
  OTHER_NATIONAL_COMPANY_REGISTRATION: "OTHER_NATIONAL_COMPANY_REGISTRATION",
  VAT_CERTIFICATE: "VAT_CERTIFICATE",
  WEBSITE: "WEBSITE",
  FINANCIAL_CREDIT_STATUS: "FINANCIAL_CREDIT_STATUS",
  LOCATION: "LOCATION",
  BUSINESS_INSURANCE: "BUSINESS_INSURANCE",
  OTHER: "OTHER",
} as const;
export type PartnerCompanyCheckType =
  (typeof PartnerCompanyCheckType)[keyof typeof PartnerCompanyCheckType];

export const PartnerCompanyCheckResult = {
  YES: "YES",
  NO: "NO",
  NOT_APPLICABLE: "NOT_APPLICABLE",
} as const;
export type PartnerCompanyCheckResult =
  (typeof PartnerCompanyCheckResult)[keyof typeof PartnerCompanyCheckResult];

/// Added 2026-10-02 — see Partner.riskTier in schema.prisma (SOP008's
/// High/Medium/Low risk-tiering model, generalized to any partner role).
export const PartnerRiskTier = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;
export type PartnerRiskTier = (typeof PartnerRiskTier)[keyof typeof PartnerRiskTier];

export const SupplierEnquiryResponseStatus = {
  QUOTED: "QUOTED",
  DECLINED: "DECLINED",
  NO_RESPONSE: "NO_RESPONSE",
  WAITING: "WAITING",
} as const;
export type SupplierEnquiryResponseStatus =
  (typeof SupplierEnquiryResponseStatus)[keyof typeof SupplierEnquiryResponseStatus];

/// Provenance for a ProductMaster entry — which reference source it came
/// from. See architecture doc, "Sector-insights data strategy" (2026-09-24)
/// for the licensing status of each: HS_CODE and GS1_GTIN (Unimed's own
/// data) are clear to use now; UNSPSC needs the UNDP embedding-terms
/// addendum signed first; WHO_EML is CC BY 3.0 IGO and safe; WHO
/// Prequalification data is deliberately NOT a source yet, pending a
/// written permissions request to WHO.
export const ProductSourceStandard = {
  WHO_EML: "WHO_EML",
  HS_CODE: "HS_CODE",
  UNSPSC: "UNSPSC",
  GS1_GTIN: "GS1_GTIN",
  INTERNAL: "INTERNAL",
} as const;
export type ProductSourceStandard = (typeof ProductSourceStandard)[keyof typeof ProductSourceStandard];

export const ProductAttributeDataType = {
  STRING: "STRING",
  NUMBER: "NUMBER",
  BOOLEAN: "BOOLEAN",
  ENUM: "ENUM",
} as const;
export type ProductAttributeDataType =
  (typeof ProductAttributeDataType)[keyof typeof ProductAttributeDataType];

// --- Added 2026-09-26, organization onboarding data model (Phase 1 of
//     admin-onboarding-intake-spec.md) — see the corresponding fields'
//     doc comments in schema.prisma ---

export const OrganizationLegalEntityType = {
  GOVERNMENT_AGENCY: "GOVERNMENT_AGENCY",
  PRIVATE_COMPANY: "PRIVATE_COMPANY",
  REGISTERED_NGO: "REGISTERED_NGO",
  FAITH_BASED_NETWORK: "FAITH_BASED_NETWORK",
  MULTILATERAL_UN_BODY: "MULTILATERAL_UN_BODY",
  COOPERATIVE: "COOPERATIVE",
  ACADEMIC_INSTITUTION: "ACADEMIC_INSTITUTION",
  INDIVIDUAL: "INDIVIDUAL",
  OTHER: "OTHER",
} as const;
export type OrganizationLegalEntityType =
  (typeof OrganizationLegalEntityType)[keyof typeof OrganizationLegalEntityType];

export const OrganizationOnboardingSource = {
  SELF_REFERRED: "SELF_REFERRED",
  INVITED_BY_PROCUREMENT_AGENT: "INVITED_BY_PROCUREMENT_AGENT",
  INVITED_BY_FUNDER: "INVITED_BY_FUNDER",
  PLATFORM_STAFF_OUTREACH: "PLATFORM_STAFF_OUTREACH",
  OTHER: "OTHER",
} as const;
export type OrganizationOnboardingSource =
  (typeof OrganizationOnboardingSource)[keyof typeof OrganizationOnboardingSource];

export const LogisticsCapability = {
  OWN: "OWN",
  SUBCONTRACTED: "SUBCONTRACTED",
  MIXED: "MIXED",
} as const;
export type LogisticsCapability = (typeof LogisticsCapability)[keyof typeof LogisticsCapability];

export const TenderingBodyType = {
  GOVERNMENT: "GOVERNMENT",
  FAITH_BASED_NETWORK: "FAITH_BASED_NETWORK",
  NGO_IMPLEMENTING_PARTNER: "NGO_IMPLEMENTING_PARTNER",
  MULTILATERAL: "MULTILATERAL",
} as const;
export type TenderingBodyType = (typeof TenderingBodyType)[keyof typeof TenderingBodyType];

/// Also used by SupplierProfile.warehousingCapability (shared shape, no
/// need for a second identical enum).
export const WarehousingCapability = {
  OWN: "OWN",
  THIRD_PARTY: "THIRD_PARTY",
  MIXED: "MIXED",
} as const;
export type WarehousingCapability = (typeof WarehousingCapability)[keyof typeof WarehousingCapability];

export const DataInsightsInstitutionType = {
  ACADEMIC: "ACADEMIC",
  NGO_NONPROFIT_RESEARCH: "NGO_NONPROFIT_RESEARCH",
  MULTILATERAL_MARKET_INTELLIGENCE: "MULTILATERAL_MARKET_INTELLIGENCE",
  COMMERCIAL_MARKET_INTELLIGENCE: "COMMERCIAL_MARKET_INTELLIGENCE",
  INDIVIDUAL_RESEARCHER: "INDIVIDUAL_RESEARCHER",
} as const;
export type DataInsightsInstitutionType =
  (typeof DataInsightsInstitutionType)[keyof typeof DataInsightsInstitutionType];
