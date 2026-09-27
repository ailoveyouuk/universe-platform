import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString, ValidateNested } from "class-validator";
import { ClientDetailDto, FreightForwarderDetailDto, ManufacturerDetailDto, SupplierDetailDto } from "./create-partner.dto";

const ROLE_TYPES = ["CLIENT", "MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "WAREHOUSING", "LOGISTICS"] as const;
const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REMOVED"] as const;

export class UpdatePartnerDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() countryCode?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsIn(APPROVAL_STATUSES) approvalStatus?: (typeof APPROVAL_STATUSES)[number];

  /** Adds any role types not already present on this Partner — never
   * removes one. Removing a role is a rarer, more deliberate action
   * (approvalStatus/PartnerApprovalHistory territory) left for later. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(ROLE_TYPES, { each: true })
  addRoleTypes?: (typeof ROLE_TYPES)[number][];

  @IsOptional() @ValidateNested() @Type(() => SupplierDetailDto) supplierDetail?: SupplierDetailDto;
  @IsOptional() @ValidateNested() @Type(() => ManufacturerDetailDto) manufacturerDetail?: ManufacturerDetailDto;
  @IsOptional() @ValidateNested() @Type(() => FreightForwarderDetailDto) freightForwarderDetail?: FreightForwarderDetailDto;
  @IsOptional() @ValidateNested() @Type(() => ClientDetailDto) clientDetail?: ClientDetailDto;
}
