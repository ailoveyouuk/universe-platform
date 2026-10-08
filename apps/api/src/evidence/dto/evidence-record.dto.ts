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
  /** Added 2026-10-08 (Lewis: "enable me to add and verify information
   * myself, but only for me"). A request flag only — EvidenceService
   * decides whether it actually takes effect, via a hardcoded, identity-
   * scoped allowlist (see SELF_SERVICE_VERIFY_EMAILS in evidence.service.ts),
   * never just a permission/role, so it can never silently extend to
   * another admin. Anyone else sending this flag is simply ignored, same
   * as if they hadn't sent it — no error, no information disclosure. */
  @IsOptional() @IsBoolean() verifyImmediately?: boolean;
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
