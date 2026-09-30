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

/** Added 2026-09-30 — see Project.completionStage's doc comment in
 * schema.prisma / procurement-lifecycle-benchmarking.md rec. #1. Only
 * meaningful when status is COMPLETED; the service layer doesn't enforce
 * that pairing server-side (matches the existing reasonForCancellation
 * field, which is likewise stored unconditionally), but the UI only shows
 * this control once a project is COMPLETED. */
const COMPLETION_STAGES = ["DELIVERED", "FINANCIALLY_CLOSED", "CLOSEOUT_FILED"] as const;

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
  @IsOptional() @IsIn(COMPLETION_STAGES) completionStage?: (typeof COMPLETION_STAGES)[number];
}
