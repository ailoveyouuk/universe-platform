import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsIn, IsOptional, IsString, ValidateNested } from "class-validator";
import {
  ClientDetailDto,
  FreightForwarderDetailDto,
  ManufacturerDetailDto,
  ManufacturerSiteDto,
  PartnerCertificationDto,
  PartnerCompanyCheckDto,
  SupplierDetailDto,
  WarehousingDetailDto,
} from "./create-partner.dto";

const ROLE_TYPES = ["CLIENT", "MANUFACTURER", "SUPPLIER", "FREIGHT_FORWARDER", "WAREHOUSING", "LOGISTICS"] as const;
const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REMOVED"] as const;
const RISK_TIERS = ["HIGH", "MEDIUM", "LOW"] as const;

export class UpdatePartnerDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() countryCode?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsIn(APPROVAL_STATUSES) approvalStatus?: (typeof APPROVAL_STATUSES)[number];
  @IsOptional() @IsIn(RISK_TIERS) riskTier?: (typeof RISK_TIERS)[number];
  @IsOptional() @IsString() companyRegistrationNumber?: string;
  @IsOptional() @IsString() vatNumber?: string;

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
  @IsOptional() @ValidateNested() @Type(() => WarehousingDetailDto) warehousingDetail?: WarehousingDetailDto;

  /** Additive, same as roles — adds new sites/documents/checks rather than
   * replacing the existing list. Removing or archiving an individual
   * document is a future dedicated endpoint (PartnerCertification already
   * has a `status` field for exactly that), not this one. */
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ManufacturerSiteDto)
  addManufacturerSites?: ManufacturerSiteDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PartnerCertificationDto)
  addCertifications?: PartnerCertificationDto[];

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PartnerCompanyCheckDto)
  addCompanyChecks?: PartnerCompanyCheckDto[];
}
