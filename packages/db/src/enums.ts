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

export const CertificationType = {
  ISO_13485: "ISO_13485",
  ISO_9001: "ISO_9001",
  ISO_14001: "ISO_14001",
  OTHER_ISO: "OTHER_ISO",
  FDA_REGISTRATION: "FDA_REGISTRATION",
  GMP: "GMP",
  GDP: "GDP",
  MIA: "MIA",
  WDA: "WDA",
  OTHER: "OTHER",
} as const;
export type CertificationType = (typeof CertificationType)[keyof typeof CertificationType];

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
