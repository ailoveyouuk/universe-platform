import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class SaveNetworkSearchDto {
  @IsString() @Length(1, 120) name!: string;
  @IsOptional() @IsBoolean() alertsEnabled?: boolean;
  @IsOptional() @IsString() @Length(0, 200) q?: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) scope?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) country?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) certType?: string[];
  @IsOptional() @IsBoolean() certified?: boolean;
  @IsOptional() @IsBoolean() whoPq?: boolean;
  @IsOptional() @IsBoolean() localMfr?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(200) minYears?: number;
  @IsOptional() @IsString() warehousing?: string;
}

export class UpdateNetworkSearchDto {
  @IsOptional() @IsString() @Length(1, 120) name?: string;
  @IsOptional() @IsBoolean() alertsEnabled?: boolean;
}
