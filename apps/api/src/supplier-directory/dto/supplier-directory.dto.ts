import { IsArray, IsBoolean, IsOptional, IsString, IsUrl } from "class-validator";

/** Every field optional — profile completion happens incrementally, and
 * publishing (a separate endpoint) is what actually makes it visible. */
export class UpsertSupplierProfileDto {
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUrl() website?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsString() contactPhone?: string;
}

export class SetCountryPresenceDto {
  /** ISO 3166-1 alpha-2 codes — replaces the caller's full presence list
   * (simplest correct semantics for a "which countries do we serve" form). */
  @IsArray()
  @IsString({ each: true })
  countryCodes!: string[];
}

export class CreateSupplierProductDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() productMasterId?: string;
  /** JSON-stringified spec values, same pattern as ProjectLine/ProductLine's
   * `attributes` — validated against the matched category's
   * ProductAttributeDefinitions at the service layer, not here. */
  @IsOptional() @IsString() specifications?: string;
  @IsOptional() @IsString() gtin?: string;
  @IsOptional() @IsString() manufacturerPartNumber?: string;
}

export class UpdateSupplierProductDto extends CreateSupplierProductDto {
  @IsOptional() @IsBoolean() isPublished?: boolean;
}
