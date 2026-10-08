import { IsString } from "class-validator";

/** Body of POST /projects/:id/contacts — mirrors AddProjectContactInput in
 * packages/types. */
export class AddProjectContactDto {
  @IsString() contactId!: string;
}
