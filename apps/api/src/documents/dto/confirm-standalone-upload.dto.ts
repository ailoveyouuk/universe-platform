import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

/** POST /documents — confirm step of the standalone (non-project) upload
 * flow. Same shape as ConfirmUploadDto, minus nothing — projectId simply
 * isn't part of this resource. Kept as its own DTO (rather than reusing
 * ConfirmUploadDto directly) so the two flows can diverge independently
 * later without one's validation rules leaking into the other. */
export class ConfirmStandaloneUploadDto {
  @IsString()
  @IsNotEmpty()
  blobName!: string;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  // EVIDENCE | CONTROLLED_DOCUMENT | OTHER — free-text, same convention as
  // ConfirmUploadDto.type. Not enum-validated for the same reason every
  // other allowed-value string field in this codebase isn't (see that
  // DTO's own comment).
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
