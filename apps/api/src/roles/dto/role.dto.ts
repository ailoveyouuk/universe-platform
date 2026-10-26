import { ArrayUnique, IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

/** The appScope values in use across the role templates (packages/db/src/organizations.ts). */
export const ROLE_APP_SCOPES = ["*", "project-management", "product-database", "insights", "crm"] as const;

export class CreateRoleDto {
  @IsUUID() organizationId!: string;
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsIn(ROLE_APP_SCOPES) appScope?: string;
  @IsArray() @ArrayUnique() @IsString({ each: true }) permissionKeys!: string[];
}

export class UpdateRoleDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string | null;
  @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true }) permissionKeys?: string[];
}
