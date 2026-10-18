import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export const LIFECYCLE_STATUSES = ["DRAFT", "ACTIVE", "RESTRICTED", "DISCONTINUED", "WITHDRAWN", "RECALLED"] as const;
export const STORAGE_CLASSES = ["AMBIENT", "CRT", "COOL", "REFRIGERATED", "FROZEN", "DEEP_FROZEN", "OTHER"] as const;

export class UpdateProductMasterDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() hsCode?: string;
  @IsOptional() @IsString() unspscCode?: string;
  @IsOptional() @IsString() gtin?: string;
  @IsOptional() @IsString() standardUnit?: string;
  @IsOptional() @IsString() canonicalManufacturerPartNumber?: string;
  @IsOptional() @IsString() expectedQualityDocumentation?: string;
  @IsOptional() @IsBoolean() isArchived?: boolean;
  // Product-record fields (2026-10-18). Empty string clears a text field.
  @IsOptional() @IsIn(LIFECYCLE_STATUSES as unknown as string[]) lifecycleStatus?: string;
  @IsOptional() @IsString() lifecycleReason?: string;
  @IsOptional() @IsString() storageClass?: string;
  @IsOptional() @IsBoolean() coldChain?: boolean;
  @IsOptional() @IsInt() @Min(1) @Max(600) shelfLifeMonths?: number;
  @IsOptional() @IsString() hazardClass?: string;
  @IsOptional() @IsBoolean() controlledSubstance?: boolean;
  @IsOptional() @IsString() inn?: string;
  @IsOptional() @IsString() strength?: string;
  @IsOptional() @IsString() dosageForm?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() packSize?: string;
  @IsOptional() @IsString() regulatoryClass?: string;
  @IsOptional() @IsString() intendedUse?: string;
  @IsOptional() @IsString() nextReviewDue?: string;
}
