import { IsIn, IsOptional, IsString, Length } from "class-validator";

export class CreateExportRestrictionDto {
  @IsString() @Length(2, 2) restrictingCountryCode!: string;
  @IsString() @Length(4, 200) medicineName!: string;
  @IsOptional() @IsString() @Length(0, 200) strength?: string;
  @IsOptional() @IsString() @Length(0, 300) form?: string;
  @IsOptional() @IsIn(["EXPORT", "HOARDING", "BOTH"]) scope?: string;
  @IsOptional() @IsString() restrictionDate?: string;
  @IsString() @Length(8, 1000) sourceUrl!: string;
  @IsOptional() @IsString() @Length(0, 4000) notes?: string;
}

export class UpdateExportRestrictionDto {
  @IsOptional() @IsIn(["ACTIVE", "REMOVED"]) status?: string;
  @IsOptional() @IsString() @Length(0, 4000) notes?: string;
  @IsOptional() @IsString() @Length(0, 1000) sourceUrl?: string;
}
