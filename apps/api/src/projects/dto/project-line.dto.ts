import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

const PRODUCT_CATEGORIES = ["CONSUMABLES", "DEVICES", "REAGENTS", "EQUIPMENT", "PHARMACEUTICALS", "LABORATORY"] as const;
const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CPT", "CIP", "CFR", "CIF", "DAP", "DPU", "DDP"] as const;
const FREIGHT_MODES = ["AIR", "SEA", "LAND"] as const;
/** Added 2026-09-30, replacing the old supplierPaymentStatusPercent field —
 * see ProjectLine.supplierPaymentStatus's doc comment in schema.prisma /
 * procurement-lifecycle-benchmarking.md rec. #2. */
const PAYMENT_STATUSES = ["NOT_STARTED", "PARTIALLY_PAID", "PAID", "OVERDUE"] as const;
/** Added 2026-09-30 — see ProjectLine.qualificationPathway's doc comment in
 * schema.prisma / benchmarking doc rec. #4. */
const QUALIFICATION_PATHWAYS = ["WHO_PQ", "SRA", "ERP", "ISO13485", "ISO9001", "WHOPES", "GHTF", "OTHER"] as const;

/**
 * Every field optional — shared by POST /projects/:id/lines (create) and
 * PATCH /projects/:id/lines/:lineId (update). Mirrors ProjectLineInput in
 * packages/types. Dates are plain ISO date strings (not IsDateString's
 * stricter datetime check) since these are calendar dates from a date
 * picker, not timestamps.
 */
export class ProjectLineDto {
  @IsOptional() @IsString() clientProductDescription?: string;
  @IsOptional() @IsString() productMasterId?: string;
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
  @IsOptional() @IsNumber() insuredValue?: number;
  @IsOptional() @IsString() insuredCurrency?: string;
  /** The PREMIUM for freight insurance — distinct from insuredValue above
   * (the sum insured). Shares freightCurrency. Added 2026-10-03. */
  @IsOptional() @IsNumber() freightInsuranceCost?: number;
  @IsOptional() @IsNumber() freightAdditionalCost?: number;
  @IsOptional() @IsString() freightAdditionalCostDescription?: string;
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
  /** Accepted but ignored as of 2026-10-02 — ProjectsService.applyPricing
   * now always computes this as supplierUnitPrice x quantity (a fact, not
   * a judgment call, unlike grossMargin/margin below), in the native
   * supplierPaymentCurrency. Kept on the DTO so older/other callers
   * sending it don't 400 against `forbidNonWhitelisted: true`. */
  @IsOptional() @IsNumber() supplierPaymentAmountTotal?: number;
  @IsOptional() @IsString() supplierPaymentCurrency?: string;
  @IsOptional() @IsString() supplierPaymentDate?: string;
  @IsOptional() @IsString() supplierDocumentsReceivedDate?: string;
  @IsOptional() @IsNumber() supplierAmountPaid?: number;
  @IsOptional() @IsIn(PAYMENT_STATUSES) supplierPaymentStatus?: (typeof PAYMENT_STATUSES)[number];
  @IsOptional() @IsNumber() unitSalesPrice?: number;
  /** Accepted but ignored as of 2026-10-02 — same reasoning as
   * supplierPaymentAmountTotal above (computed server-side from
   * unitSalesPrice x quantity). */
  @IsOptional() @IsNumber() clientPaymentAmount?: number;
  @IsOptional() @IsString() clientPaymentCurrency?: string;
  @IsOptional() @IsString() clientPaymentDate?: string;
  @IsOptional() @IsString() internalInvoiceNumber?: string;
  @IsOptional() @IsString() internalInvoiceDate?: string;
  @IsOptional() @IsNumber() grossMargin?: number;
  @IsOptional() @IsNumber() margin?: number;
  /** Markup % applied to supplierPaymentAmountTotal on the way to the
   * client invoice — see ProjectsService.applyPricing. Added 2026-10-03. */
  @IsOptional() @IsNumber() @Min(0) productMarginPercent?: number;
  /** Markup % applied to freightTotalCost — deliberately separate from
   * productMarginPercent. Added 2026-10-03. */
  @IsOptional() @IsNumber() @Min(0) freightMarginPercent?: number;
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
  @IsOptional() @IsIn(QUALIFICATION_PATHWAYS) qualificationPathway?: (typeof QUALIFICATION_PATHWAYS)[number];
  @IsOptional() @IsString() qualificationPathwayExpiryDate?: string;
}
