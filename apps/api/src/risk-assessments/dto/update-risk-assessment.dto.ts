import { IsIn, IsOptional, IsString } from "class-validator";

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const LIKELIHOODS = ["LOW", "MEDIUM", "HIGH"] as const;
const STATUSES = ["OPEN", "MITIGATED", "ACCEPTED", "CLOSED"] as const;

export class UpdateRiskAssessmentDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(SEVERITIES) severity?: (typeof SEVERITIES)[number];
  @IsOptional() @IsIn(LIKELIHOODS) likelihood?: (typeof LIKELIHOODS)[number];
  @IsOptional() @IsString() mitigation?: string;
  @IsOptional() @IsString() ownerId?: string;
  @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
  @IsOptional() @IsString() reviewDate?: string;
}
