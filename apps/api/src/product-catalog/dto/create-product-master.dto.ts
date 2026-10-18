import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from "class-validator";

export class CreateProductIdentifierDto {
  @IsString() @IsNotEmpty() value!: string;
  @IsIn(["UNIT", "INNER", "OUTER", "PALLET"]) packagingLevel!: string;
  @IsOptional() @IsInt() @Min(1) unitsPerPack?: number;
}

/**
 * POST /product-catalog — adds a new entry to the shared, central
 * ProductMaster catalogue. See ProductCatalogService's doc comment for the
 * full design, and the `ProductPicker` component in `@universe/ui` for the
 * UI that calls this. Deliberately minimal: an organisation contributing a
 * product here is NOT the same as that organisation's own QA-verified
 * record for it (ProductSourceApproval) — this just gets the item into the
 * shared catalogue, in the standardised shape, so it can be found, matched,
 * and built on by anyone. See claude/product-catalog-build.md and
 * claude/sop-driven-quality-roadmap.md Section B1.
 */
export class CreateProductMasterDto {
  @IsOptional() @IsString() name?: string;
  @IsString() @IsNotEmpty() category!: string;
  @IsOptional() @IsString() hsCode?: string;
  @IsOptional() @IsString() unspscCode?: string;
  @IsOptional() @IsString() gtin?: string;
  @IsOptional() @IsString() standardUnit?: string;
  @IsOptional() @IsString() canonicalManufacturerPartNumber?: string;
  @IsOptional() @IsString() expectedQualityDocumentation?: string;
  @IsOptional() @IsString() familyId?: string;
  @IsOptional() @IsString() variantLabel?: string;
  @IsOptional() @IsString() newFamilyName?: string;
  @IsOptional() @IsString() brand?: string;
  @IsOptional() @IsString() inn?: string;
  @IsOptional() @IsString() strength?: string;
  @IsOptional() @IsString() dosageForm?: string;
  @IsOptional() @IsString() packSize?: string;
  @IsOptional() @IsString() regulatoryClass?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => CreateProductIdentifierDto) identifiers?: CreateProductIdentifierDto[];
}
