import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min, ValidateNested } from "class-validator";
import { EXCLUSION_GROUNDS, INCOTERMS, SCREENING_LISTS, SCREENING_OUTCOMES } from "@universe/types";
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
  @IsOptional() @IsString() @Length(1, 64) timeZone?: string;
  @IsOptional() @IsBoolean() standstillEnabled?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(30) standstillWorkingDays?: number;
  @IsOptional() @IsBoolean() publicNotice?: boolean;
  @IsOptional() @IsBoolean() allowTemplateSubmission?: boolean;
  @IsOptional() @IsBoolean() emergencyProcurement?: boolean;
  @IsOptional() @IsString() @Length(0, 1000) emergencyReason?: string;
  @IsOptional() @IsBoolean() allowSingleEvaluator?: boolean;
  @IsOptional() @IsString() @Length(0, 1000) singleEvaluatorReason?: string;
  @IsOptional() @IsBoolean() requireIntegrityPledge?: boolean;
  @IsOptional() @IsBoolean() requireExclusionDeclaration?: boolean;
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
  @IsOptional() @IsIn(["MANUAL", "PRICE", "LEAD_TIME"]) metric?: string;
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

export class ExclusionDeclarationDto {
  @IsBoolean() noGrounds!: boolean;
  @IsOptional() @IsArray() @IsIn(EXCLUSION_GROUNDS.map((g) => g.value), { each: true }) grounds?: string[];
  @IsOptional() @IsString() @Length(0, 4000) explanation?: string;
}
export class InterestDto {
  @IsOptional() @IsBoolean() integrityPledge?: boolean;
  @IsOptional() @ValidateNested() @Type(() => ExclusionDeclarationDto) exclusion?: ExclusionDeclarationDto;
}
export class AskQuestionDto { @IsString() @Length(5, 4000) question!: string; }
export class AnswerQuestionDto {
  @IsString() @Length(1, 8000) answer!: string;
  /** The question as published to everyone. Defaults to the asked text; edit it to remove anything that identifies the asker. */
  @IsOptional() @IsString() @Length(5, 4000) publishedQuestion?: string;
}
export class ClarificationDto { @IsString() @Length(5, 4000) question!: string; @IsString() @Length(1, 8000) answer!: string; }
export class AddendumDto {
  @IsString() @Length(1, 300) title!: string;
  @IsString() @Length(1, 20000) body!: string;
  @IsOptional() @IsBoolean() requiresAcknowledgement?: boolean;
  @IsOptional() @IsDateString() newClosingAt?: string;
}
export class ScreeningDto {
  @IsString() organisationId!: string;
  @IsArray() @IsIn(SCREENING_LISTS.map((l) => l.value), { each: true }) lists!: string[];
  @IsIn(SCREENING_OUTCOMES.map((o) => o.value)) outcome!: string;
  @IsOptional() @IsString() @Length(0, 4000) notes?: string;
  @IsDateString() screenedOn!: string;
}

export class TemplateUploadDto {
  @IsString() @Length(1, 300) fileName!: string;
  @IsString() @Length(1, 4_000_000) contentBase64!: string;
}

export class BidLineDto {
  @IsString() tenderLineId!: string;
  @IsBoolean() noBid!: boolean;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) unitPrice?: number | null;
  @IsOptional() @IsInt() @Min(0) @Max(3650) leadTimeDays?: number | null;
  @IsOptional() @IsString() @Length(2, 2) countryOfOrigin?: string | null;
  @IsOptional() @IsString() @Length(0, 300) manufacturerName?: string | null;
  @IsOptional() @IsString() @Length(0, 1000) remarks?: string | null;
}
export class BidResponseDto {
  @IsString() criterionId!: string;
  @IsOptional() @IsString() @Length(0, 20000) text?: string | null;
}
export class BidSaveDto {
  @IsOptional() @IsString() @Length(3, 3) bidCurrency?: string | null;
  @IsOptional() @IsBoolean() validityConfirmed?: boolean;
  @IsOptional() @IsString() @Length(0, 4000) notes?: string | null;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BidLineDto) lines?: BidLineDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BidResponseDto) responses?: BidResponseDto[];
}
export class RequestBidFileDto {
  @IsString() @Length(1, 300) fileName!: string;
  @IsString() @Length(1, 200) contentType!: string;
  @IsInt() @Min(1) fileSizeBytes!: number;
}
export class ConfirmBidFileDto {
  @IsString() @Length(1, 500) blobName!: string;
  @IsString() @Length(1, 300) fileName!: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsInt() @Min(0) fileSizeBytes?: number;
  @IsOptional() @IsString() criterionId?: string | null;
}

// ---- evaluation and award (step 4)
export class EvaluatorInputDto { @IsString() userId!: string; @IsIn(["CHAIR", "EVALUATOR"]) role!: string }
export class SetEvaluatorsDto { @IsArray() @ValidateNested({ each: true }) @Type(() => EvaluatorInputDto) evaluators!: EvaluatorInputDto[] }
export class CoiDto {
  @IsBoolean() noConflict!: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) conflictedOrganisationIds?: string[];
  @IsOptional() @IsString() @Length(0, 4000) notes?: string;
}
export class GateDto { @IsString() bidId!: string; @IsString() criterionId!: string; @IsBoolean() passed!: boolean; @IsOptional() @IsString() @Length(0, 4000) notes?: string }
export class ScoreItemDto { @IsString() criterionId!: string; @IsNumber() @Min(0) @Max(100) score!: number; @IsOptional() @IsString() @Length(0, 8000) rationale?: string }
export class SaveScoresDto {
  @IsString() bidId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ScoreItemDto) scores!: ScoreItemDto[];
  @IsOptional() @IsBoolean() submit?: boolean;
}
export class ModerationDto { @IsString() bidId!: string; @IsString() criterionId!: string; @IsNumber() @Min(0) @Max(100) score!: number; @IsOptional() @IsString() @Length(0, 8000) rationale?: string }
export class AwardLineDto { @IsString() tenderLineId!: string; @IsNumber() @Min(0.01) @Max(100) sharePercent!: number }
export class AwardItemDto {
  @IsString() bidId!: string;
  @IsString() @Length(1, 8000) reason!: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => AwardLineDto) lines?: AwardLineDto[];
}
export class FeedbackItemDto { @IsString() bidId!: string; @IsString() @Length(0, 8000) text!: string }
export class AwardDto {
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => AwardItemDto) awards!: AwardItemDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => FeedbackItemDto) feedback?: FeedbackItemDto[];
  @IsOptional() @IsBoolean() waiveStandstill?: boolean;
}
export class DebriefFeedbackDto { @IsString() @Length(0, 8000) feedback!: string }
export class ComplaintDto { @IsString() @Length(10, 8000) body!: string }
export class ComplaintResponseDto { @IsIn(["UPHELD", "REJECTED", "RESOLVED"]) status!: string; @IsString() @Length(1, 8000) response!: string }

// ---- tender documents with versions (2026-10-21)
export const TENDER_DOC_TYPES = ["SPECIFICATION", "TERMS", "DRAWING", "TEMPLATE", "OTHER"] as const;
export class RequestTenderDocumentDto {
  @IsString() @Length(1, 300) fileName!: string;
  @IsString() @Length(1, 200) contentType!: string;
  @IsInt() @Min(1) fileSizeBytes!: number;
}
export class ConfirmTenderDocumentDto {
  @IsString() @Length(1, 500) blobName!: string;
  @IsString() @Length(1, 300) fileName!: string;
  @IsString() @Length(1, 300) title!: string;
  @IsIn(TENDER_DOC_TYPES as unknown as string[]) docType!: string;
  @IsOptional() @IsString() @Length(0, 1000) description?: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsInt() @Min(0) fileSizeBytes?: number;
  /** Id of the current version this upload replaces; omit to add a new document. */
  @IsOptional() @IsString() replacesDocumentId?: string;
}
