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
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
