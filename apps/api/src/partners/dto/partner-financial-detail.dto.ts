import { IsOptional, IsString } from "class-validator";

/**
 * PartnerFinancialDetail (added 2026-10-14) was schema-only until now —
 * see backend-frontend-wiring-audit.md's dead-schema findings. It's a
 * one-to-one record keyed by partnerId (no own id — see
 * schema.prisma's `partnerId String @id`), so there's one DTO for the
 * single upsert endpoint, not separate add/update ones like
 * PartnerCertification/PartnerCompanyCheck above. Every field is
 * optional: a partner can have some fields on file and not others (e.g.
 * sortCode for a UK bank, iban/swiftBic for an international one), and
 * the caller only sends what they're changing.
 *
 * No validation beyond IsString on accountNumber/sortCode/iban/swiftBic
 * deliberately — these are opaque strings from a partner's own bank
 * paperwork (format varies by country), not values this system
 * generates or needs to understand, so pattern-validating them would
 * just be a way to reject a real but unexpected format.
 */
export class UpsertPartnerFinancialDetailDto {
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() accountHolderName?: string;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @IsString() sortCode?: string;
  @IsOptional() @IsString() iban?: string;
  @IsOptional() @IsString() swiftBic?: string;
  @IsOptional() @IsString() branchAddress?: string;
  @IsOptional() @IsString() currencyCode?: string;
}
