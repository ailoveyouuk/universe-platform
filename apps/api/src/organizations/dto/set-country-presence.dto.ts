import { IsArray, IsString } from "class-validator";

/**
 * Added 2026-10-14 — see OrganizationCountryPresenceSummary's doc comment
 * in @universe/types. Mirrors SetCountryPresenceDto in
 * supplier-directory/dto/supplier-directory.dto.ts exactly: ISO 3166-1
 * alpha-2 codes, replace-the-whole-list semantics (simplest correct
 * shape for a "which countries do we operate in" form).
 */
export class SetOrganizationCountryPresenceDto {
  @IsArray()
  @IsString({ each: true })
  countryCodes!: string[];
}
