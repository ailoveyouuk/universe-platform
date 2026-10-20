import { IsBoolean, IsDateString, IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import {
  COMPLAINT_ACTION_TYPES, COMPLAINT_CATEGORIES, COMPLAINT_CHANNELS, COMPLAINT_DIRECTIONS, COMPLAINT_OUTCOMES, COMPLAINT_REACTIONS,
  COMPLAINT_REGULATOR_DECISIONS, COMPLAINT_REMEDIES, COMPLAINT_ROOT_CAUSES, COMPLAINT_SEVERITIES,
} from "@universe/types";

/** Fields shared by creating and editing the basic record. */
export class UpdateComplaintDto {
  @IsOptional() @IsString() @MaxLength(300) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(COMPLAINT_CHANNELS as readonly string[]) channel?: string;
  @IsOptional() @IsDateString() receivedAt?: string;
  @IsOptional() @IsString() partnerId?: string;
  @IsOptional() @IsString() contactId?: string;
  @IsOptional() @IsString() @MaxLength(300) complainantName?: string;
  @IsOptional() @IsString() @MaxLength(300) complainantEmail?: string;
  @IsOptional() @IsString() @MaxLength(100) complainantPhone?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() projectLineId?: string;
  @IsOptional() @IsString() productBatchId?: string;
  @IsOptional() @IsString() productMasterId?: string;
  @IsOptional() @IsBoolean() flagPatientSafety?: boolean;
  @IsOptional() @IsBoolean() flagSuspectedFalsified?: boolean;
  @IsOptional() @IsBoolean() flagTemperatureExcursion?: boolean;
}

export class CreateComplaintDto extends UpdateComplaintDto {
  @IsIn(COMPLAINT_DIRECTIONS as readonly string[]) direction!: string;
  @IsString() @MaxLength(300) override title!: string;
  @IsString() override description!: string;
  @IsOptional() @IsIn(COMPLAINT_CATEGORIES as readonly string[]) category?: string;
  @IsOptional() @IsIn(COMPLAINT_SEVERITIES as readonly string[]) severity?: string;
}

export class TriageComplaintDto {
  @IsIn(COMPLAINT_CATEGORIES as readonly string[]) category!: string;
  @IsIn(COMPLAINT_SEVERITIES as readonly string[]) severity!: string;
  @IsString() ownerId!: string;
  @IsOptional() @IsString() investigatorId?: string;
  @IsOptional() @IsBoolean() flagPatientSafety?: boolean;
  @IsOptional() @IsBoolean() flagSuspectedFalsified?: boolean;
  @IsOptional() @IsBoolean() flagTemperatureExcursion?: boolean;
}

export class SaveInvestigationDto {
  @IsOptional() @IsString() investigatorId?: string;
  @IsOptional() @IsString() investigationScope?: string;
  @IsOptional() @IsIn(COMPLAINT_ROOT_CAUSES as readonly string[]) rootCauseCategory?: string;
  @IsOptional() @IsString() rootCause?: string;
  @IsOptional() @IsString() findings?: string;
  @IsOptional() @IsString() impactSummary?: string;
  @IsOptional() @IsIn(COMPLAINT_OUTCOMES as readonly string[]) outcome?: string;
  /** Marks the investigation finished; needs outcome, root-cause category and findings. */
  @IsOptional() @IsBoolean() complete?: boolean;
}

export class PartnerResponseDto {
  @IsString() partnerResponse!: string;
  @IsOptional() @IsDateString() respondedAt?: string;
}

export class ResolveComplaintDto {
  @IsIn(COMPLAINT_REMEDIES as readonly string[]) remedyType!: string;
  @IsOptional() @IsString() remedyNotes?: string;
  @IsOptional() @IsDateString() responseSentAt?: string;
  @IsOptional() @IsString() responseSummary?: string;
  @IsOptional() @IsIn(COMPLAINT_REACTIONS as readonly string[]) complainantReaction?: string;
}

export class RegulatorDecisionDto {
  @IsIn(COMPLAINT_REGULATOR_DECISIONS as readonly string[]) decision!: string;
  @IsString() @MaxLength(1000) reason!: string;
  @IsOptional() @IsString() @MaxLength(200) reference?: string;
}

export class CloseComplaintDto {
  @IsString() closureSummary!: string;
  @IsOptional() @IsString() lessonsLearned?: string;
  @IsOptional() @IsDateString() effectivenessCheckDueAt?: string;
  /** Needed when the person closing is also the investigator. */
  @IsOptional() @IsString() @MaxLength(1000) overrideReason?: string;
}

export class ReasonDto {
  @IsString() @MaxLength(1000) reason!: string;
}

export class ComplaintNoteDto {
  @IsIn(["NOTE", "COMMUNICATION_OUT", "COMMUNICATION_IN"]) kind!: string;
  @IsString() @MaxLength(500) summary!: string;
  @IsOptional() @IsString() body?: string;
}

export class CreateComplaintActionDto {
  @IsIn(COMPLAINT_ACTION_TYPES as readonly string[]) type!: string;
  @IsString() description!: string;
  @IsString() ownerId!: string;
  @IsDateString() dueDate!: string;
}

export class UpdateComplaintActionDto {
  @IsOptional() @IsIn(["OPEN", "DONE", "CANCELLED"]) status?: string;
  @IsOptional() @IsString() completionNotes?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() ownerId?: string;
}

export class EffectivenessDto {
  @IsString() effectivenessNotes!: string;
}

export class RaiseRiskDto {
  @IsIn(["LOW", "MEDIUM", "HIGH", "CRITICAL"]) severity!: string;
  @IsIn(["LOW", "MEDIUM", "HIGH"]) likelihood!: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() mitigation?: string;
  @IsOptional() @IsString() ownerId?: string;
}

export class SourceReviewDto {
  /** REVERIFY brings the approval's review date forward; SUSPEND also returns it to PENDING (needs products.approve). */
  @IsIn(["REVERIFY", "SUSPEND"]) action!: string;
  @IsOptional() @IsString() note?: string;
}
