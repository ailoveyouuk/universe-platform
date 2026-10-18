import { IsIn, IsOptional, IsString, Length } from "class-validator";

export const REGISTRATION_AUTHORITIES = ["WHO_PQ", "WHO_EUL", "FDA", "EU_CE", "EU_MDR", "EU_IVDR", "EMA", "MHRA", "SRA", "NATIONAL", "OTHER"] as const;
export const REGISTRATION_STATUSES = ["ACTIVE", "PENDING", "SUSPENDED", "WITHDRAWN", "EXPIRED", "REFUSED"] as const;
export const VERIFICATION_OUTCOMES = ["VERIFIED", "NOT_APPLICABLE", "ISSUE_FOUND"] as const;

export class CreateRegistrationDto {
  @IsIn(REGISTRATION_AUTHORITIES as unknown as string[]) authority!: string;
  @IsOptional() @IsString() scheme?: string;
  @IsString() @Length(1, 200) referenceNumber!: string;
  @IsOptional() @IsString() regulatoryClass?: string;
  @IsOptional() @IsString() @Length(2, 2) countryCode?: string;
  @IsOptional() @IsString() holderName?: string;
  @IsOptional() @IsString() issueDate?: string;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() @IsIn(REGISTRATION_STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsString() sourceUrl?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateRegistrationDto {
  @IsOptional() @IsIn(REGISTRATION_AUTHORITIES as unknown as string[]) authority?: string;
  @IsOptional() @IsString() scheme?: string;
  @IsOptional() @IsString() @Length(1, 200) referenceNumber?: string;
  @IsOptional() @IsString() regulatoryClass?: string;
  @IsOptional() @IsString() countryCode?: string;
  @IsOptional() @IsString() holderName?: string;
  @IsOptional() @IsString() issueDate?: string;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() @IsIn(REGISTRATION_STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsString() sourceUrl?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() isArchived?: boolean;
  @IsOptional() @IsIn(["CONTRIBUTED", "SOURCE_VERIFIED"]) verificationLevel?: string;
}

export class VerifyRegistrationDto {
  @IsIn(VERIFICATION_OUTCOMES as unknown as string[]) outcome!: string;
  @IsOptional() @IsString() jurisdiction?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() nextReverificationDue?: string;
}
