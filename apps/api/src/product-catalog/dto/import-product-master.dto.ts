import { ArrayMinSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

/**
 * POST /product-catalog/import — bulk upserts reference-data rows into the
 * shared ProductMaster catalogue. Added 2026-10-03 for the Product
 * Database Management app's importer screen.
 *
 * Why this exists rather than just reusing create(): HS codes, the WHO
 * Essential Medicines List, UNSPSC, and Unimed's own GS1 GTIN data are all
 * licensed/cleared to seed ProductMaster from (see architecture-decisions.md,
 * "Commodity/product classification strategy" — HS and WHO EML are
 * unblocked today; UNSPSC needs a signed UNDP terms addendum first, GTIN
 * needs Unimed's own export), but none of that data lives in this
 * environment or can be fetched from here (no network access to
 * who.int/trademap/etc. from this sandbox) — so rather than hand-typing a
 * handful of codes and calling it an importer, this is the re-runnable
 * mechanism itself: Lewis (or anyone with a real sourced CSV/export) pastes
 * rows in, picks the source standard once, and every row is upserted.
 * Idempotent by design (see ProductCatalogService.importBatch) so the same
 * file can be re-run safely once a fuller export is available.
 */
export class ImportProductMasterRowDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() category!: string;
  @IsOptional() @IsString() hsCode?: string;
  @IsOptional() @IsString() unspscCode?: string;
  @IsOptional() @IsString() gtin?: string;
  @IsOptional() @IsString() standardUnit?: string;
}

export class ImportProductMasterDto {
  @IsIn(["HS_CODE", "WHO_EML", "UNSPSC", "GS1_GTIN"])
  sourceStandard!: "HS_CODE" | "WHO_EML" | "UNSPSC" | "GS1_GTIN";

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportProductMasterRowDto)
  rows!: ImportProductMasterRowDto[];
}
