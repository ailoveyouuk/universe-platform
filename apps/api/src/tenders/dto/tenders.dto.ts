import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min, ValidateNested } from "class-validator";
import { INCOTERMS } from "@universe/types";
import { RULE_TYPES } from "../eligibility";

export const TENDER_TYPES = ["RFQ", "RFP", "ITT", "OPEN_TENDER", "FRAMEWORK"] as const;
export const VISIBILITIES = ["ELIGIBLE_ORGANISATIONS", "ALL_REGISTERED", "INVITED_ONLY"] as const;
export const CRITERION_KINDS = ["GATE", "SCORED"] as const;
export const RESPONSE_FORMATS = ["UPLOAD", "TEXT", "EITHER"] as const;

export class UpdateTenderDto {
  @IsOptional() @IsString() @Length(1, 300) title?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsIn(TENDER_TYPES as unknown as string[]) tenderType?: string;
  @IsOptional() @IsIn(VISIBILITIES as unknown as string[]) visibility?: string;
  @IsOptional() @IsString() deliveryCountryCodes?: string;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;
  @IsOptional() @IsIn(INCOTERMS as unknown as string[]) incoterm?: string;
  @IsOptional() @IsString() clientName?: string;
  @IsOptional() @IsDateString() clarificationDeadline?: string;
  @IsOptional() @IsDateString() closingAt?: string;
  @IsOptional() @IsDateString() evaluationDueAt?: string;
  @IsOptional() @IsDateString() awardDueAt?: string;
  @IsOptional() @IsInt() @Min(1) @Max(730) bidValidityDays?: number;
  @IsOptional() @IsDateString() contractStartDate?: string;
  @IsOptional() @IsString() acceptedFileTypes?: string;
  @IsOptional() @IsInt() @Min(1) @Max(200) maxFileSizeMb?: number;
  @IsOptional() @IsBoolean() allowTextSubmission?: boolean;
  @IsOptional() @IsString() termsAndConditions?: string;
}
export class CreateTenderDto extends UpdateTenderDto {
  @IsString() @Length(1, 300) override title!: string;
}

export class TenderLineDto {
  @IsOptional() @IsInt() lotNumber?: number;
  @IsOptional() @IsString() lotTitle?: string;
  @IsString() @Length(1, 500) description!: string;
  @IsOptional() @IsString() productMasterId?: string;
  @IsOptional() @IsString() specification?: string;
  @IsOptional() @IsNumber() quantity?: number;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() @Length(2, 2) destinationCountryCode?: string;
  @IsOptional() @IsString() requiredRegistration?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) minShelfLifePercent?: number;
  @IsOptional() @IsBoolean() coldChainRequired?: boolean;
}
export class SetLinesDto { @IsArray() @ValidateNested({ each: true }) @Type(() => TenderLineDto) lines!: TenderLineDto[] }

export class TenderCriterionDto {
  @IsString() @Length(1, 300) title!: string;
  @IsOptional() @IsString() description?: string;
  @IsIn(CRITERION_KINDS as unknown as string[]) kind!: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100) weight?: number;
  @IsOptional() @IsBoolean() isMandatory?: boolean;
  @IsOptional() @IsIn(RESPONSE_FORMATS as unknown as string[]) responseFormat?: string;
  @IsOptional() @IsString() acceptedFileTypes?: string;
}
export class SetCriteriaDto { @IsArray() @ValidateNested({ each: true }) @Type(() => TenderCriterionDto) criteria!: TenderCriterionDto[] }

export class TenderRuleDto {
  @IsIn(RULE_TYPES as unknown as string[]) ruleType!: string;
  @IsString() @Length(1, 500) ruleValue!: string;
  @IsOptional() @IsString() @Length(0, 500) explanation?: string;
  @IsOptional() @IsBoolean() isRequired?: boolean;
}
export class SetRulesDto { @IsArray() @ValidateNested({ each: true }) @Type(() => TenderRuleDto) rules!: TenderRuleDto[] }

export class InviteDto { @IsArray() @IsString({ each: true }) organizationIds!: string[] }
export class CancelTenderDto { @IsString() @Length(1, 1000) reason!: string }
export class ShortlistDto { @IsOptional() @IsString() @Length(0, 500) note?: string }

export class SavedSearchDto {
  @IsString() @Length(1, 200) name!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) categories?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) countries?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) types?: string[];
  @IsOptional() @IsBoolean() onlyEligible?: boolean;
  @IsOptional() @IsString() keyword?: string;
  @IsOptional() @IsBoolean() alertsEnabled?: boolean;
}
