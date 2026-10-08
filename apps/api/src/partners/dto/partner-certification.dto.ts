import { IsDateString, IsIn, IsOptional, IsString } from "class-validator";

const CERTIFICATION_STATUSES = ["CURRENT", "ARCHIVED"] as const;

/**
 * Sub-resource DTOs for PartnerCertificationsController — added
 * 2026-10-08 to close the gap flagged in
 * compliance-standards-gap-analysis.md: before this, a single
 * certification could only be ADDED (CreatePartnerDto.certifications /
 * UpdatePartnerDto.addCertifications), never edited or retired on its
 * own. PartnerCertification.status already models "retire" (CURRENT |
 * ARCHIVED — see its doc comment in schema.prisma), so retiring one is
 * just PATCH .../certifications/:certId with { status: "ARCHIVED" } —
 * no hard delete, no schema change needed.
 *
 * `manufacturerSiteId` here is a real id (unlike
 * PartnerCertificationDto.manufacturerSiteIndex on the create-partner
 * path, which is an array index because the site doesn't have a real id
 * yet at that point) — see PartnersService.addCertification.
 */
export class AddPartnerCertificationDto {
  @IsString() type!: string;
  @IsOptional() @IsString() referenceNumber?: string;
  @IsOptional() @IsString() revision?: string;
  @IsOptional() @IsString() issuingBody?: string;
  @IsOptional() @IsDateString() issuedDate?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsDateString() verifiedAt?: string;
  @IsOptional() @IsIn(CERTIFICATION_STATUSES) status?: (typeof CERTIFICATION_STATUSES)[number];
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() manufacturerSiteId?: string;
  @IsOptional() @IsString() relatedCompanyCheckType?: string;
}

/** All fields optional — a PATCH edits only what's provided, same
 * `dto.field !== undefined` convention as UpdatePartnerDto. Also how a
 * certification is retired: `{ status: "ARCHIVED" }` and nothing else. */
export class UpdatePartnerCertificationDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() referenceNumber?: string;
  @IsOptional() @IsString() revision?: string;
  @IsOptional() @IsString() issuingBody?: string;
  @IsOptional() @IsDateString() issuedDate?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsDateString() verifiedAt?: string;
  @IsOptional() @IsIn(CERTIFICATION_STATUSES) status?: (typeof CERTIFICATION_STATUSES)[number];
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() manufacturerSiteId?: string;
  @IsOptional() @IsString() relatedCompanyCheckType?: string;
}
