import { IsBoolean, IsIn, IsOptional, IsString, Matches } from "class-validator";

export class CreateOrganizationDto {
  @IsString()
  name!: string;

  /** ISO alpha-2 code (Country.code) — optional, added 2026-10-09. */
  @IsOptional()
  @IsString()
  countryOfRegistrationCode?: string;

  @Matches(/^[a-z0-9-]+$/, { message: "slug must be lowercase letters, numbers, and hyphens only" })
  slug!: string;

  /** One of six Organization.type values, defaulting to
   * PROCUREMENT_SERVICE_AGENT — see Organization.type's doc comment in
   * schema.prisma. Optional so existing callers/tests that don't pass it
   * keep working. */
  @IsOptional()
  @IsIn(["PROCUREMENT_SERVICE_AGENT", "TENDERING_PURCHASING_BODY", "MANUFACTURER", "SUPPLIER", "FUNDER_DONOR", "DATA_INSIGHTS_USER"])
  type?: "PROCUREMENT_SERVICE_AGENT" | "TENDERING_PURCHASING_BODY" | "MANUFACTURER" | "SUPPLIER" | "FUNDER_DONOR" | "DATA_INSIGHTS_USER";

  /** Must be `true` — the platform-staff member creating this org
   * affirmatively confirming the signed data sharing / privacy agreement is
   * on file (see packages/db/src/organizations.ts). Not itself the consent
   * mechanism (that's unconditional on every org), just an audit gate so a
   * form can't be submitted without someone consciously checking the box. */
  @IsBoolean()
  @IsIn([true], { message: "confirmedAgreementOnFile must be true — the signed agreement must be on file before an organisation is provisioned" })
  confirmedAgreementOnFile!: boolean;
}
