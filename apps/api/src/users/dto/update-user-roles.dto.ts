import { IsArray, IsUUID } from "class-validator";

/** Allows an empty array (a user with no roles — still a valid, if
 * unusual, state; org.users.manage can always fix it later) so no
 * ArrayNotEmpty here, unlike InviteUserDto's roleIds. */
export class UpdateUserRolesDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  roleIds!: string[];
}
