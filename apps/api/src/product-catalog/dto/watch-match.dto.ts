import { IsOptional, IsString, Length } from "class-validator";

export class ConfirmWatchMatchDto {
  @IsOptional() @IsString() @Length(0, 4000) notes?: string;
}

export class DismissWatchMatchDto {
  @IsString() @Length(3, 4000) notes!: string;
}
