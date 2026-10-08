import { IsDateString, IsIn, IsOptional, IsString } from "class-validator";

const COMPANY_CHECK_RESULTS = ["YES", "NO", "NOT_APPLICABLE"] as const;

/** Sub-resource DTOs for PartnerCompanyChecksController — added
 * 2026-10-08, same gap as PartnerCertification's own dedicated endpoints
 * (see partner-certification.dto.ts's doc comment). PartnerCompanyCheck
 * is a verification check result, not a document with its own lifecycle
 * — it has no CURRENT/ARCHIVED-style status and isn't given a retire
 * path here, matching the task's scope (company checks get add/edit
 * only). */
export class AddPartnerCompanyCheckDto {
  @IsString() checkType!: string;
  @IsOptional() @IsString() customLabel?: string;
  @IsIn(COMPANY_CHECK_RESULTS) result!: (typeof COMPANY_CHECK_RESULTS)[number];
  @IsOptional() @IsDateString() checkedDate?: string;
  @IsOptional() @IsString() referenceOrSource?: string;
  @IsOptional() @IsString() comment?: string;
}

export class UpdatePartnerCompanyCheckDto {
  @IsOptional() @IsString() checkType?: string;
  @IsOptional() @IsString() customLabel?: string;
  @IsOptional() @IsIn(COMPANY_CHECK_RESULTS) result?: (typeof COMPANY_CHECK_RESULTS)[number];
  @IsOptional() @IsDateString() checkedDate?: string;
  @IsOptional() @IsString() referenceOrSource?: string;
  @IsOptional() @IsString() comment?: string;
}
