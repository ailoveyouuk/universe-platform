import { IsDateString, IsIn, IsOptional, IsString } from "class-validator";

const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

/**
 * Creates a standing, organization-owned sourcing approval — see
 * ProductSourceApproval's doc comment in schema.prisma for why this is a
 * deliberate, explicit QA action rather than anything derived from order
 * history.
 */
export class CreateProductSourceApprovalDto {
  @IsString() productMasterId!: string;
  @IsString() manufacturerId!: string;
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsIn(APPROVAL_STATUSES) status?: (typeof APPROVAL_STATUSES)[number];
  @IsOptional() @IsDateString() nextReviewDue?: string;
  @IsOptional() @IsString() notes?: string;
}
