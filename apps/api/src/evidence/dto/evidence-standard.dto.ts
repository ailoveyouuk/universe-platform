import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

const CATEGORIES = ["QUALITY", "BUSINESS", "FINANCIAL", "REGULATORY", "INSURANCE", "OTHER"] as const;
const EVIDENCE_TYPES = ["DOCUMENT", "CHECK"] as const;

/** Gap 3 (compliance-standards-gap-analysis.md) — appliesToStakeholderTypes
 * is accepted/returned as a real string[] at the API boundary (an actual
 * multiselect), then comma-joined for storage by the service — same
 * convention ClientDetail.productCategoryLicenses uses internally, kept out
 * of the DTO so callers never have to know about the storage encoding. */
export class CreateEvidenceStandardDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsIn(CATEGORIES) category!: (typeof CATEGORIES)[number];
  @IsArray() @IsString({ each: true }) appliesToStakeholderTypes!: string[];
  @IsIn(EVIDENCE_TYPES) evidenceType!: (typeof EVIDENCE_TYPES)[number];
  @IsOptional() @IsBoolean() isMandatory?: boolean;
  @IsOptional() @IsBoolean() requiresExpiry?: boolean;
  @IsOptional() @IsInt() @Min(1) reVerificationFrequencyMonths?: number;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateEvidenceStandardDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(CATEGORIES) category?: (typeof CATEGORIES)[number];
  @IsOptional() @IsArray() @IsString({ each: true }) appliesToStakeholderTypes?: string[];
  @IsOptional() @IsIn(EVIDENCE_TYPES) evidenceType?: (typeof EVIDENCE_TYPES)[number];
  @IsOptional() @IsBoolean() isMandatory?: boolean;
  @IsOptional() @IsBoolean() requiresExpiry?: boolean;
  @IsOptional() @IsInt() @Min(1) reVerificationFrequencyMonths?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}
