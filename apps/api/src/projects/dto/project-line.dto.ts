import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

const PRODUCT_CATEGORIES = ["CONSUMABLES", "DEVICES", "REAGENTS", "EQUIPMENT", "PHARMACEUTICALS", "LABORATORY"] as const;
const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CPT", "CIP", "CFR", "CIF", "DAP", "DPU", "DDP"] as const;
const FREIGHT_MODES = ["AIR", "SEA", "LAND"] as const;

/**
 * Every field optional — shared by POST /projects/:id/lines (create) and
 * PATCH /projects/:id/lines/:lineId (update). Mirrors ProjectLineInput in
 * packages/types. Dates are plain ISO date strings (not IsDateString's
 * stricter datetime check) since these are calendar dates from a date
 * picker, not timestamps.
 */
export class ProjectLineDto {
  @IsOptional() @IsString() clientProductDescription?: string;
  @IsOptional() @IsInt() @Min(0) quantity?: number;
  @IsOptional() @IsIn(PRODUCT_CATEGORIES) productCategory?: (typeof PRODUCT_CATEGORIES)[number];
  @IsOptional() @IsString() countryOfManufactureCode?: string;
  @IsOptional() @IsIn(INCOTERMS) incoterm?: (typeof INCOTERMS)[number];
  @IsOptional() @IsIn(FREIGHT_MODES) freightMode?: (typeof FREIGHT_MODES)[number];
  @IsOptional() @IsString() manufacturerId?: string;
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsString() clientPoNumber?: string;
  @IsOptional() @IsString() clientPoReceiptDate?: string;
  @IsOptional() @IsString() internalPoNumber?: string;
  @IsOptional() @IsString() internalPoDatePlaced?: string;
  @IsOptional() @IsString() gad?: string;
  @IsOptional() @IsString() supplierGad?: string;
  @IsOptional() @IsString() freightForwarderId?: string;
  @IsOptional() @IsNumber() freightCost?: number;
  @IsOptional() @IsString() freightCurrency?: string;
  @IsOptional() @IsString() warehouseReferenceNumber?: string;
  @IsOptional() @IsString() goodsCollectedDate?: string;
  @IsOptional() @IsString() goodsManufacturedDate?: string;
  @IsOptional() @IsString() goodsDeliveredToClientDate?: string;
  @IsOptional() @IsString() promisedDeliveryDate?: string;
  @IsOptional() @IsString() actualDeliveryDate?: string;
  @IsOptional() @IsBoolean() internalOnTime?: boolean;
  @IsOptional() @IsBoolean() supplierOnTime?: boolean;
  @IsOptional() @IsBoolean() supplierInFull?: boolean;
  @IsOptional() @IsNumber() supplierUnitPrice?: number;
  @IsOptional() @IsNumber() supplierPaymentAmountTotal?: number;
  @IsOptional() @IsString() supplierPaymentCurrency?: string;
  @IsOptional() @IsString() supplierPaymentDate?: string;
  @IsOptional() @IsString() supplierDocumentsReceivedDate?: string;
  @IsOptional() @IsNumber() supplierPaymentStatusPercent?: number;
  @IsOptional() @IsNumber() unitSalesPrice?: number;
  @IsOptional() @IsNumber() clientPaymentAmount?: number;
  @IsOptional() @IsString() clientPaymentCurrency?: string;
  @IsOptional() @IsString() clientPaymentDate?: string;
  @IsOptional() @IsString() internalInvoiceNumber?: string;
  @IsOptional() @IsString() internalInvoiceDate?: string;
  @IsOptional() @IsNumber() grossMargin?: number;
  @IsOptional() @IsNumber() margin?: number;
  @IsOptional() @IsString() strength?: string;
  @IsOptional() @IsString() form?: string;
  @IsOptional() @IsString() packSize?: string;
  @IsOptional() @IsString() batchNumber?: string;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() @IsString() storageConditions?: string;
  @IsOptional() @IsString() dataLoggerReference?: string;
  @IsOptional() @IsBoolean() dataLoggerReportReviewed?: boolean;
  @IsOptional() @IsString() excursionReview?: string;
  @IsOptional() @IsBoolean() customerApproved?: boolean;
  @IsOptional() @IsBoolean() rpApproved?: boolean;
  @IsOptional() @IsString() maPl?: string;
}
