import { IsEmail, MaxLength } from "class-validator";

/** Adds an existing user, by email, to a demo organisation's cross-organisation access list (2026-10-21). */
export class AddOrganizationAccessDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
