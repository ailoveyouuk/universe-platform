import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateTemperatureLogDto {
  @IsOptional() @IsString() projectLineId?: string;
  @IsOptional() @IsString() loggerReference?: string;
  @IsOptional() @IsString() readingSummary?: string;
  @IsOptional() @IsBoolean() hasExcursion?: boolean;
  @IsOptional() @IsString() excursionNotes?: string;
  @IsOptional() @IsString() recordedAt?: string;
}

export class ReviewTemperatureLogDto {
  @IsOptional() @IsString() excursionNotes?: string;
}
