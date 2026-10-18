import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateDataExportRequestDto {
  @IsIn(["CATALOGUE", "REGISTRATIONS"]) scope!: "CATALOGUE" | "REGISTRATIONS";
  @IsString() @MinLength(10, { message: "Please say why you need the export (at least a sentence)." }) @MaxLength(2000) reason!: string;
  @IsOptional() @IsObject() filters?: { q?: string; category?: string; sourceStandard?: string; status?: string; includeArchived?: boolean };
}

export class DecideDataExportRequestDto {
  @IsBoolean() approve!: boolean;
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}
