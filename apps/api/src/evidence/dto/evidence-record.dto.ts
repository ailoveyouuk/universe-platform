import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

const RESULTS = ["YES", "NO", "NOT_APPLICABLE"] as const;

export class CreateEvidenceRecordDto {
  @IsString() partnerId!: string;
  @IsString() standardId!: string;
  @IsOptional() @IsString() referenceNumber?: string;
  @IsOptional() @IsString() issuingBody?: string;
  @IsOptional() @IsString() issuedDate?: string;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() @IsIn(RESULTS) result?: (typeof RESULTS)[number];
  @IsOptional() @IsString() documentId?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateEvidenceRecordDto {
  @IsOptional() @IsString() referenceNumber?: string;
  @IsOptional() @IsString() issuingBody?: string;
  @IsOptional() @IsString() issuedDate?: string;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() @IsIn(RESULTS) result?: (typeof RESULTS)[number];
  @IsOptional() @IsString() documentId?: string;
  @IsOptional() @IsString() notes?: string;
}

/** A dedicated action, not a plain field PATCH — matches the e-signature-
 * meaning convention from Gap 2 (PartnersService's approval flow): the
 * certification statement shown at the moment of verifying is recorded
 * alongside the attribution, not bolted on as just another field. */
export class VerifyEvidenceRecordDto {
  @IsBoolean() approve!: boolean;
  @IsOptional() @IsString() notes?: string;
}
