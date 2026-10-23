import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from "class-validator";

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

/** Directory profile as edited from an organisation's hub in Admin; null clears a field. */
export class UpsertOrgDirectoryProfileDto {
  @IsOptional() @IsString() @MaxLength(4000) description?: string | null;
  @IsOptional() @IsUrl() website?: string | null;
  @IsOptional() @IsString() @MaxLength(200) contactName?: string | null;
  @IsOptional() @IsString() @MaxLength(200) contactEmail?: string | null;
  @IsOptional() @IsString() @MaxLength(60) contactPhone?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(200, { each: true }) principalManufacturersRepresented?: string[];
  @IsOptional() @IsString() @MaxLength(200) wholesaleDistributionLicense?: string | null;
  @IsOptional() @IsIn(["OWN", "THIRD_PARTY", "MIXED"]) warehousingCapability?: "OWN" | "THIRD_PARTY" | "MIXED" | null;
  @IsOptional() @IsInt() @Min(0) @Max(300) yearsInOperation?: number | null;
}
