import { IsDateString, IsIn, IsOptional, IsString } from "class-validator";

const STATUSES = [
  "IDENTIFIED",
  "IN_PROGRESS",
  "SUBMITTED",
  "AWARDED",
  "COMPLETED",
  "UNAWARDED",
  "DECLINED",
  "CANCELLED",
] as const;

export class UpdateProjectDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsString() donorReference?: string;
  @IsOptional() @IsString() deliveryCountryCode?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsDateString() submissionDate?: string;
  @IsOptional() @IsString() managementResponsibility?: string;
  @IsOptional() @IsString() reasonForCancellation?: string;
  @IsOptional() @IsString() projectNotes?: string;
}
