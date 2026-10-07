import { IsIn, IsOptional, IsString } from "class-validator";

const STATUSES = ["ACTIVE", "QUARANTINED", "EXPIRED", "WITHDRAWN"] as const;
const QUALIFICATION_PATHWAYS = ["WHO_PQ", "SRA", "ERP"] as const;

export class CreateProductBatchDto {
  @IsString() batchNumber!: string;
  @IsOptional() @IsString() productMasterId?: string;
  @IsOptional() @IsString() manufacturerId?: string;
  @IsOptional() @IsString() manufacturedDate?: string;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() @IsString() storageConditions?: string;
  @IsOptional() @IsIn(QUALIFICATION_PATHWAYS) qualificationPathway?: (typeof QUALIFICATION_PATHWAYS)[number];
  @IsOptional() @IsString() qualificationPathwayExpiryDate?: string;
  @IsOptional() @IsString() maPl?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateProductBatchDto {
  @IsOptional() @IsString() productMasterId?: string;
  @IsOptional() @IsString() manufacturerId?: string;
  @IsOptional() @IsString() manufacturedDate?: string;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() @IsString() storageConditions?: string;
  @IsOptional() @IsIn(QUALIFICATION_PATHWAYS) qualificationPathway?: (typeof QUALIFICATION_PATHWAYS)[number];
  @IsOptional() @IsString() qualificationPathwayExpiryDate?: string;
  @IsOptional() @IsString() maPl?: string;
  @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
  @IsOptional() @IsString() notes?: string;
}

export class SearchProductBatchesDto {
  @IsOptional() @IsString() batchNumber?: string;
  @IsOptional() @IsString() productMasterId?: string;
  @IsOptional() @IsString() manufacturerId?: string;
  @IsOptional() @IsIn(STATUSES) status?: (typeof STATUSES)[number];
}
