import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

/** POST /projects/:projectId/documents — step 2 of the two-step upload
 * flow, called once the browser's direct-to-blob PUT (using the SAS from
 * step 1) has succeeded. blobName must be the exact value step 1 returned —
 * DocumentsService doesn't re-derive it, it trusts this request the same
 * way every other create endpoint in this app trusts its DTO (ownership is
 * what's checked, not the blob's existence — a genuinely missing blob just
 * means a broken download link later, not a security issue, since the
 * container is per-org already). */
export class ConfirmUploadDto {
  @IsString()
  @IsNotEmpty()
  blobName!: string;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  // CHECKLIST | ISSUES | CLOSEOUT_REPORT | OTHER — see the allowed-values
  // reference comment at the top of schema.prisma. Not an enum-validated
  // DTO field, same convention ProjectLine's own string-typed allowed-value
  // fields already use throughout this codebase.
  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  fileSizeBytes?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;
}
