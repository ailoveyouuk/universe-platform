import { IsString, Matches } from "class-validator";

export class CreateOrganizationDto {
  @IsString()
  name!: string;

  @Matches(/^[a-z0-9-]+$/, { message: "slug must be lowercase letters, numbers, and hyphens only" })
  slug!: string;
}
