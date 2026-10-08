import { IsString } from "class-validator";

/** Body of POST /projects/:id/leads — mirrors AddProjectLeadInput in
 * packages/types. */
export class AddProjectLeadDto {
  @IsString() userId!: string;
}
