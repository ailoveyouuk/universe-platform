import { IsBoolean, IsIn, IsString, Matches } from "class-validator";

export class CreateOrganizationDto {
  @IsString()
  name!: string;

  @Matches(/^[a-z0-9-]+$/, { message: "slug must be lowercase letters, numbers, and hyphens only" })
  slug!: string;

  /** Must be `true` — the platform-staff member creating this org
   * affirmatively confirming the signed data sharing / privacy agreement is
   * on file (see packages/db/src/organizations.ts). Not itself the consent
   * mechanism (that's unconditional on every org), just an audit gate so a
   * form can't be submitted without someone consciously checking the box. */
  @IsBoolean()
  @IsIn([true], { message: "confirmedAgreementOnFile must be true — the signed agreement must be on file before an organization is provisioned" })
  confirmedAgreementOnFile!: boolean;
}
