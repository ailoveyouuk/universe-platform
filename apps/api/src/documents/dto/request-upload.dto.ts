import { IsNotEmpty, IsString } from "class-validator";

/** POST /projects/:projectId/documents/upload-url — step 1 of the two-step
 * upload flow (see DocumentsService doc comment). fileName/contentType are
 * only used to shape the SAS (content type) and the stored blobName — the
 * actual bytes never pass through this request. */
export class RequestUploadDto {
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  contentType!: string;
}
