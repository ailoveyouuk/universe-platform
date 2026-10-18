import { IsBoolean, IsIn, IsOptional, IsString, Length } from "class-validator";

export const SAFETY_NOTICE_TYPES = ["RECALL", "FIELD_SAFETY_NOTICE", "SAFETY_ALERT", "FALSIFIED_ALERT", "SUPPLY_ALERT"] as const;
export const SAFETY_NOTICE_SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
export const SAFETY_NOTICE_AUTHORITIES = ["WHO_PQ", "WHO_EUL", "FDA", "EU_CE", "EU_MDR", "EU_IVDR", "EMA", "MHRA", "SRA", "NATIONAL", "MANUFACTURER", "OTHER"] as const;
export const SAFETY_NOTICE_STATUSES = ["OPEN", "CLOSED"] as const;
export const SAFETY_REVIEW_OUTCOMES = ["CHECKED_NO_IMPACT", "NOT_APPLICABLE", "ACTION_TAKEN", "AFFECTED"] as const;

export class CreateSafetyNoticeDto {
  @IsIn(SAFETY_NOTICE_TYPES as unknown as string[]) noticeType!: string;
  @IsIn(SAFETY_NOTICE_SEVERITIES as unknown as string[]) severity!: string;
  @IsIn(SAFETY_NOTICE_AUTHORITIES as unknown as string[]) authority!: string;
  @IsOptional() @IsString() @Length(0, 200) referenceNumber?: string;
  @IsString() @Length(3, 300) title!: string;
  @IsString() @Length(3, 8000) summary!: string;
  @IsOptional() @IsString() @Length(0, 8000) actionRequired?: string;
  @IsOptional() @IsString() @Length(0, 4000) affectedBatches?: string;
  @IsOptional() @IsString() @Length(0, 400) countryCodes?: string;
  @IsString() issueDate!: string;
  @IsOptional() @IsString() @Length(0, 1000) sourceUrl?: string;
}

export class UpdateSafetyNoticeDto {
  @IsOptional() @IsIn(SAFETY_NOTICE_TYPES as unknown as string[]) noticeType?: string;
  @IsOptional() @IsIn(SAFETY_NOTICE_SEVERITIES as unknown as string[]) severity?: string;
  @IsOptional() @IsIn(SAFETY_NOTICE_AUTHORITIES as unknown as string[]) authority?: string;
  @IsOptional() @IsString() @Length(0, 200) referenceNumber?: string;
  @IsOptional() @IsString() @Length(3, 300) title?: string;
  @IsOptional() @IsString() @Length(3, 8000) summary?: string;
  @IsOptional() @IsString() @Length(0, 8000) actionRequired?: string;
  @IsOptional() @IsString() @Length(0, 4000) affectedBatches?: string;
  @IsOptional() @IsString() @Length(0, 400) countryCodes?: string;
  @IsOptional() @IsString() issueDate?: string;
  @IsOptional() @IsString() @Length(0, 1000) sourceUrl?: string;
  @IsOptional() @IsIn(SAFETY_NOTICE_STATUSES as unknown as string[]) status?: string;
  @IsOptional() @IsString() @Length(0, 4000) closedReason?: string;
  @IsOptional() @IsBoolean() isArchived?: boolean;
  @IsOptional() @IsIn(["CONTRIBUTED", "SOURCE_VERIFIED"]) verificationLevel?: string;
}

export class ReviewSafetyNoticeDto {
  @IsIn(SAFETY_REVIEW_OUTCOMES as unknown as string[]) outcome!: string;
  @IsOptional() @IsString() @Length(0, 4000) notes?: string;
}
