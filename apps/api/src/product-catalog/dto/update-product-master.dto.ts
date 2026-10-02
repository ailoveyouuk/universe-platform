import { IsBoolean, IsOptional, IsString } from "class-validator";

/**
 * PATCH /product-catalog/:id — edits an existing ProductMaster entry. Added
 * 2026-10-03 for the Product Database Management app's catalogue
 * list/detail screen (the first dedicated place to browse and maintain the
 * shared catalogue — until now it was only ever touched inline through
 * ProductPicker's search-or-create flow). Every field optional: a save
 * sends only what changed. Deliberately does NOT allow changing
 * sourceStandard, addedByOrganizationId, or addedByOrganizationType —
 * those are provenance, frozen at creation/import time, not editable
 * after the fact (see ProductMaster's doc comment in schema.prisma).
 */
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
}
