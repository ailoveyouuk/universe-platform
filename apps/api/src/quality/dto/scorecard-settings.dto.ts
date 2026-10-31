import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class UpdateScorecardSettingsDto {
  @IsOptional() @IsInt() @Min(1) @Max(100) onTimeGood?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) onTimeWarn?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) inFullGood?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) inFullWarn?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) otifGood?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) otifWarn?: number;
  /** Working days early / late within which a delivery counts as on time. */
  @IsOptional() @IsInt() @Min(0) @Max(120) earlyDays?: number;
  @IsOptional() @IsInt() @Min(0) @Max(60) lateDays?: number;
  /** Complaint response times: working days to acknowledge and triage (serious ones separately); calendar days to resolve by severity and for a supplier to reply. */
  @IsOptional() @IsInt() @Min(1) @Max(30) ackWorkingDays?: number;
  @IsOptional() @IsInt() @Min(1) @Max(60) triageWorkingDays?: number;
  @IsOptional() @IsInt() @Min(1) @Max(10) triageSeriousWorkingDays?: number;
  @IsOptional() @IsInt() @Min(1) @Max(365) resolveMinorDays?: number;
  @IsOptional() @IsInt() @Min(1) @Max(365) resolveMajorDays?: number;
  @IsOptional() @IsInt() @Min(1) @Max(365) resolveCriticalDays?: number;
  @IsOptional() @IsInt() @Min(1) @Max(120) partnerResponseDays?: number;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
