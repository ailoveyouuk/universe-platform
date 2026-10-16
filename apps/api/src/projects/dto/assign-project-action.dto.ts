import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

/** Body of POST /projects/:id/actions — mirrors AssignProjectActionInput. */
export class AssignProjectActionDto {
  @IsString() assigneeUserId!: string;
  @IsString() @MinLength(1) @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(800) note?: string;
  @IsOptional() @IsISO8601() dueDate?: string;
}
