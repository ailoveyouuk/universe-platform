import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString, ValidateNested } from "class-validator";

const ROLE_TYPES = ["CLIENT", "MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "WAREHOUSING", "LOGISTICS"] as const;

export class SupplierDetailDto {
  @IsOptional() @IsString() supplierCode?: string;
  @IsOptional() @IsString() productCategory?: string;
  @IsOptional() @IsString() fdaRegistrationNumber?: string;
}

export class ManufacturerDetailDto {
  @IsOptional() @IsString() partNumberConvention?: string;
  @IsOptional() @IsString() countryOfManufactureCode?: string;
}

export class FreightForwarderDetailDto {
  @IsOptional() @IsString() preferredIncoterm?: string;
  @IsOptional() @IsString() serviceRegions?: string;
}

export class ClientDetailDto {
  @IsOptional() @IsString() billingAddress?: string;
  @IsOptional() @IsString() deliveryAddress?: string;
  @IsOptional() @IsString() paymentTerms?: string;
}

/**
 * A Partner is a real-world company a tenant does business with (client,
 * supplier, manufacturer, freight forwarder), scoped to the caller's own
 * organization — see PartnersService and the naming note at the top of
 * schema.prisma (Partner vs. Organization). Created with at least one role;
 * role-specific detail objects are optional and only meaningful for the
 * matching role (a SUPPLIER role can carry supplierDetail, etc. — the
 * service doesn't cross-check that they match, it's just organized this
 * way for a sane form UX).
 */
export class CreatePartnerDto {
  @IsString() name!: string;
  @IsOptional() @IsString() countryCode?: string;
  @IsOptional() @IsString() website?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(ROLE_TYPES, { each: true })
  roleTypes!: (typeof ROLE_TYPES)[number][];

  @IsOptional() @ValidateNested() @Type(() => SupplierDetailDto) supplierDetail?: SupplierDetailDto;
  @IsOptional() @ValidateNested() @Type(() => ManufacturerDetailDto) manufacturerDetail?: ManufacturerDetailDto;
  @IsOptional() @ValidateNested() @Type(() => FreightForwarderDetailDto) freightForwarderDetail?: FreightForwarderDetailDto;
  @IsOptional() @ValidateNested() @Type(() => ClientDetailDto) clientDetail?: ClientDetailDto;
}
