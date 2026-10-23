import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { CertificationType } from "@universe/db";

export class SetOrganizationScopeDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  scopeSubIds!: string[];
}

export class SaveOrganizationCertificationDto {
  @IsIn(Object.values(CertificationType))
  type!: string;

  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(200) reference?: string;
  @IsOptional() @IsString() @MaxLength(200) issuingBody?: string;
  @IsOptional() @IsDateString() issuedOn?: string | null;
  @IsOptional() @IsDateString() expiresOn?: string | null;
  @IsOptional() @IsString() @MaxLength(4000) notes?: string;
}
