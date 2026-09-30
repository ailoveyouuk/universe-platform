import { IsIn, IsNumber, IsOptional, IsString } from "class-validator";

const RESPONSE_STATUSES = ["WAITING", "QUOTED", "DECLINED", "NO_RESPONSE"] as const;

/** Every field optional — the common real-world edit is just flipping
 * responseStatus to QUOTED and filling in the price once a supplier
 * responds, but supplierId itself can change too (e.g. correcting which
 * Partner record an enquiry was logged against). */
export class UpdateSupplierEnquiryDto {
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsString() dateContacted?: string | null;
  @IsOptional() @IsIn(RESPONSE_STATUSES) responseStatus?: (typeof RESPONSE_STATUSES)[number];
  @IsOptional() @IsNumber() quotedPrice?: number | null;
  @IsOptional() @IsString() quotedCurrency?: string | null;
  @IsOptional() @IsString() notes?: string | null;
}
