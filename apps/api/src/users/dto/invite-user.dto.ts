import { ArrayNotEmpty, IsArray, IsEmail, IsString, IsUUID } from "class-validator";

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  forename!: string;

  @IsString()
  surname!: string;

  @IsUUID()
  organizationId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID(undefined, { each: true })
  roleIds!: string[];
}
