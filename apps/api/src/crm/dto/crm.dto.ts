import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from "class-validator";
import { CRM_HEALTH, CRM_INTERACTION_TYPES, CRM_STATUSES, CRM_TIERS } from "@universe/types";

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
