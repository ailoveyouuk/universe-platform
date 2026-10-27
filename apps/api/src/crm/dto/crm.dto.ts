import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from "class-validator";
import { CRM_DECISION_ROLES, CRM_OPPORTUNITY_KINDS, CRM_OPPORTUNITY_STAGES, CRM_HEALTH, CRM_INTERACTION_TYPES, CRM_LAWFUL_BASES, CRM_PRIVACY_REQUEST_TYPES, CRM_STATUSES, CRM_SUBSCRIBER_TYPES, CRM_TIERS } from "@universe/types";

export class UpdateRelationshipDto {
  @IsOptional() @IsIn([...CRM_TIERS]) tier?: string;
  @IsOptional() @IsIn([...CRM_STATUSES]) status?: string;
  @IsOptional() @IsString() @MaxLength(100) ownerUserId?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) summary?: string | null;
  @IsOptional() @IsInt() @Min(1) @Max(60) reviewIntervalMonths?: number;
  @IsOptional() @IsBoolean() markReviewed?: boolean;
  @IsOptional() @IsIn([...CRM_HEALTH]) healthOverride?: string | null;
  @IsOptional() @IsString() @MaxLength(500) healthOverrideReason?: string | null;
  @IsOptional() @IsBoolean() archived?: boolean;
}

export class FollowUpDto {
  @IsString() @MaxLength(100) assigneeUserId!: string;
  @IsString() @MaxLength(40) dueDate!: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string | null;
}

export class InteractionDto {
  @IsOptional() @IsIn([...CRM_INTERACTION_TYPES]) type?: (typeof CRM_INTERACTION_TYPES)[number];
  @IsOptional() @IsString() @MaxLength(40) occurredAt?: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(4000) summary?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) outcome?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) participantUserIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) contactIds?: string[];
  @IsOptional() @IsString() @MaxLength(100) linkedProjectId?: string | null;
  @IsOptional() @IsBoolean() confidential?: boolean;
  @IsOptional() @IsBoolean() archived?: boolean;
  @IsOptional() @ValidateNested() @Type(() => FollowUpDto) followUp?: FollowUpDto | null;
}

export class PersonProfileDto {
  @IsOptional() @IsIn([...CRM_DECISION_ROLES]) decisionRole?: (typeof CRM_DECISION_ROLES)[number] | null;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
  @IsOptional() @IsIn([...CRM_LAWFUL_BASES]) lawfulBasis?: (typeof CRM_LAWFUL_BASES)[number];
  @IsOptional() @IsString() @MaxLength(500) lawfulBasisReason?: string | null;
  @IsOptional() @IsIn([...CRM_SUBSCRIBER_TYPES]) subscriberType?: (typeof CRM_SUBSCRIBER_TYPES)[number];
  @IsOptional() @IsIn(["ACTIVE", "LEFT", "RESTRICTED"]) status?: "ACTIVE" | "LEFT" | "RESTRICTED";
  @IsOptional() @IsBoolean() markVerified?: boolean;
  @IsOptional() @IsBoolean() noticeSent?: boolean;
}
export class AnonymiseDto {
  @IsString() @MaxLength(500) reason!: string;
  @IsOptional() @IsString() @MaxLength(100) privacyRequestId?: string | null;
}
export class PrivacyRequestDto {
  @IsIn([...CRM_PRIVACY_REQUEST_TYPES]) type!: (typeof CRM_PRIVACY_REQUEST_TYPES)[number];
  @IsString() @MaxLength(200) requesterName!: string;
  @IsOptional() @IsString() @MaxLength(300) requesterEmail?: string | null;
  @IsString() @MaxLength(40) receivedAt!: string;
  @IsOptional() @IsString() @MaxLength(100) contactId?: string | null;
}
export class PrivacyRequestUpdateDto {
  @IsOptional() @IsBoolean() identityConfirmed?: boolean;
  @IsOptional() @IsBoolean() pauseClock?: boolean;
  @IsOptional() @IsBoolean() resumeClock?: boolean;
  @IsOptional() @IsBoolean() extendTwoMonths?: boolean;
  @IsOptional() @IsIn(["OPEN", "WAITING", "COMPLETED", "REFUSED"]) status?: "OPEN" | "WAITING" | "COMPLETED" | "REFUSED";
  @IsOptional() @IsString() @MaxLength(1000) decision?: string | null;
  @IsOptional() @IsString() @MaxLength(500) exemptionReason?: string | null;
}
export class SuppressDto { @IsString() @MaxLength(300) email!: string; }

export class OpportunityDto {
  @IsOptional() @IsString() @MaxLength(100) relationshipId?: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsIn([...CRM_OPPORTUNITY_KINDS]) kind?: (typeof CRM_OPPORTUNITY_KINDS)[number];
  @IsOptional() @IsIn([...CRM_OPPORTUNITY_STAGES]) stage?: (typeof CRM_OPPORTUNITY_STAGES)[number];
  @IsOptional() @IsNumber() expectedValue?: number | null;
  @IsOptional() @IsString() @MaxLength(3) currency?: string | null;
  @IsOptional() @IsString() @MaxLength(40) expectedDate?: string | null;
  @IsOptional() @IsString() @MaxLength(100) ownerUserId?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string | null;
  @IsOptional() @IsString() @MaxLength(500) lostReason?: string | null;
  @IsOptional() @IsString() @MaxLength(100) linkedProjectId?: string | null;
  @IsOptional() @IsBoolean() archived?: boolean;
}

export class TagDto {
  @IsOptional() @IsString() @MaxLength(60) name?: string;
  @IsOptional() @IsBoolean() archived?: boolean;
}

export class SavedFilterDto {
  @IsOptional() @IsString() @MaxLength(20) view?: "RELATIONSHIPS" | "PORTFOLIO";
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() filters?: Record<string, string>;
  @IsOptional() @IsBoolean() shared?: boolean;
  @IsOptional() @IsBoolean() archived?: boolean;
}

export class LocationDto {
  @IsOptional() @IsIn(["HQ", "OFFICE", "FACTORY", "WAREHOUSE", "OTHER"]) kind?: "HQ" | "OFFICE" | "FACTORY" | "WAREHOUSE" | "OTHER";
  @IsOptional() @IsString() @MaxLength(150) name?: string;
  @IsOptional() @IsString() @MaxLength(3) countryCode?: string | null;
  @IsOptional() @IsString() @MaxLength(100) city?: string | null;
  @IsOptional() @IsString() @MaxLength(500) address?: string | null;
  @IsOptional() @IsString() @MaxLength(60) phone?: string | null;
  @IsOptional() @IsString() @MaxLength(200) email?: string | null;
  @IsOptional() @IsString() @MaxLength(500) notes?: string | null;
  @IsOptional() @IsBoolean() archived?: boolean;
}

export class LinkDto {
  @IsOptional() @IsIn(["WEBSITE", "SOCIAL", "PORTAL", "QUALITY", "OTHER"]) kind?: "WEBSITE" | "SOCIAL" | "PORTAL" | "QUALITY" | "OTHER";
  @IsOptional() @IsString() @MaxLength(100) label?: string;
  @IsOptional() @IsString() @MaxLength(500) url?: string;
  @IsOptional() @IsBoolean() archived?: boolean;
}
