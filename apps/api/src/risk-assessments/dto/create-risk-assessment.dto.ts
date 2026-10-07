import { IsIn, IsOptional, IsString } from "class-validator";

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const LIKELIHOODS = ["LOW", "MEDIUM", "HIGH"] as const;

/** Gap 4 (compliance-standards-gap-analysis.md) — subjectType is free text
 * by design (same convention as FieldChangeLog.tableName), not a hardcoded
 * enum, so a new subject kind never needs a DTO change — but the ones in
 * active use today are listed here for the frontend's own dropdown. */
export const RISK_SUBJECT_TYPES = ["PARTNER", "PROJECT", "PRODUCT_BATCH", "OTHER"] as const;

export class CreateRiskAssessmentDto {
  @IsString() subjectType!: string;
  @IsString() subjectId!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsIn(SEVERITIES) severity!: (typeof SEVERITIES)[number];
  @IsIn(LIKELIHOODS) likelihood!: (typeof LIKELIHOODS)[number];
  @IsOptional() @IsString() mitigation?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsString() reviewDate?: string;
}
