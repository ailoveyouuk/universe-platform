import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/** PATCH /users/:id (added 2026-10-16). undefined = untouched; jobTitle may be
 * null to clear. platformStaffRole is platform-staff only and SUPER_ADMIN-gated
 * in UsersService — shape only is validated here. */
export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) forename?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100) surname?: string;
  @IsOptional() @IsString() @MaxLength(150) jobTitle?: string | null;
  @IsOptional() @IsIn(["NONE", "SUPPORT", "SUPER_ADMIN"]) platformStaffRole?: string;
  /** Apps this person may use; null clears the restriction (every app). */
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsIn(["project-management", "product-database", "tender-issuance", "insights", "admin"], { each: true }) appAccess?: string[] | null;
}
