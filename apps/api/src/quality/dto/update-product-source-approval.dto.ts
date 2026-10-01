import { IsDateString, IsIn, IsOptional, IsString } from "class-validator";

const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export class UpdateProductSourceApprovalDto {
  @IsOptional() @IsIn(APPROVAL_STATUSES) status?: (typeof APPROVAL_STATUSES)[number];
  @IsOptional() @IsDateString() nextReviewDue?: string | null;
  @IsOptional() @IsString() notes?: string | null;
}
