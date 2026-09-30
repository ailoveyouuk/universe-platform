import { IsIn, IsNumber, IsOptional, IsString } from "class-validator";

/** Mirrors SupplierEnquiryResponseStatus in packages/db/src/enums.ts. */
const RESPONSE_STATUSES = ["WAITING", "QUOTED", "DECLINED", "NO_RESPONSE"] as const;

/**
 * A SupplierEnquiry is a structured RFQ record against one ProjectLine —
 * added to the schema 2026-09-24 (see architecture-decisions.md, "Schema
 * rework": "replacing free-text Notes") but never given an API/UI until
 * Phase 2, 2026-09-30. supplierId is required (an enquiry without a
 * supplier isn't an enquiry yet — capture it as a line Note until a
 * supplier is known); everything else about the response is optional since
 * a freshly-created enquiry is naturally still WAITING with nothing back
 * yet.
 */
export class CreateSupplierEnquiryDto {
  @IsString() supplierId!: string;
  @IsOptional() @IsString() dateContacted?: string;
  @IsOptional() @IsIn(RESPONSE_STATUSES) responseStatus?: (typeof RESPONSE_STATUSES)[number];
  @IsOptional() @IsNumber() quotedPrice?: number;
  @IsOptional() @IsString() quotedCurrency?: string;
  @IsOptional() @IsString() notes?: string;
}
