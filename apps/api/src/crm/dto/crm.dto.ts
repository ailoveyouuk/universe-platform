import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { CRM_HEALTH, CRM_STATUSES, CRM_TIERS } from "@universe/types";

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
