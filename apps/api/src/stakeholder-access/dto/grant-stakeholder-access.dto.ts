import { IsEmail, IsString, MinLength } from "class-validator";

export class GrantStakeholderAccessDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  forename!: string;

  @IsString()
  @MinLength(1)
  surname!: string;
}
