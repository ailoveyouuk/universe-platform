import { IsIn, IsObject, IsOptional, IsString, Length } from "class-validator";

export class SaveInsightsUserItemDto {
  @IsIn(["VIEW", "PIN"]) kind!: "VIEW" | "PIN";
  @IsString() @Length(1, 120) name!: string;
  @IsString() @Length(1, 120) target!: string;
  @IsOptional() @IsObject() state?: Record<string, unknown> | null;
}

export class RenameInsightsUserItemDto {
  @IsString() @Length(1, 120) name!: string;
}
