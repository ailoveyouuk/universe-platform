import { Type } from "class-transformer";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

const CATEGORIES = ["PROCUREMENT", "TECHNICAL_ASSISTANCE"] as const;
const PROJECT_TYPES = ["PHARMACEUTICAL", "NON_PHARMACEUTICAL"] as const;
const PRODUCT_CATEGORIES = ["CONSUMABLES", "DEVICES", "REAGENTS", "EQUIPMENT", "PHARMACEUTICALS", "LABORATORY"] as const;

/**
 * Added 2026-09-24, schema rework: mirrors CreateProjectLineInput in
 * packages/types. Project is now a header only — line-level fields
 * (product/quantity, and eventually the full procurement/financial/
 * logistics/pharma-batch block) live on ProjectLine. This DTO covers just
 * the first line created alongside the header, matching the existing
 * single-page intake UX.
 */
export class CreateProjectLineDto {
  @IsOptional() @IsString() clientProductDescription?: string;
  @IsOptional() @IsIn(PRODUCT_CATEGORIES) productCategory?: (typeof PRODUCT_CATEGORIES)[number];
  @IsOptional() @IsInt() @Min(1) quantity?: number;
}

export class CreateProjectDto {
  @IsString() referenceNumber!: string;
  @IsString() title!: string;
  @IsIn(CATEGORIES) category!: (typeof CATEGORIES)[number];
  @IsIn(PROJECT_TYPES) projectType!: (typeof PROJECT_TYPES)[number];
  @IsOptional() @IsString() clientId?: string;
  /** Optional — see architecture doc: not a required structural concept for
   * procurement service agents, who may not know or have a donor/funding
   * source at all. Tracked only when the organization knows and wants it. */
  @IsOptional() @IsString() donorReference?: string;
  @IsOptional() @IsString() deliveryCountryCode?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateProjectLineDto)
  firstLine?: CreateProjectLineDto;
}
