import { IsOptional, IsString } from "class-validator";

export class CreateControlledDocumentDto {
  @IsString() title!: string;
  @IsString() category!: string;
  @IsString() version!: string;
  @IsOptional() @IsString() effectiveDate?: string;
  /** When set, this new version replaces that existing (current) row —
   * see ControlledDocument.supersedes's doc comment in schema.prisma. */
  @IsOptional() @IsString() supersedesId?: string;
  @IsOptional() @IsString() documentId?: string;
}

export class UpdateControlledDocumentDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() effectiveDate?: string;
  /** Setting this records who approved the current version — no
   * dedicated certification statement is wired to this action; Gap 2's
   * e-signature scaffolding covers the stakeholder-approval and
   * evidence-verification controls specifically, not every approval
   * action platform-wide. */
  @IsOptional() @IsString() approvedById?: string;
  @IsOptional() @IsString() documentId?: string;
}
