import { IsNotEmpty, IsString, IsUrl } from "class-validator";

/** POST /documents/link — added 2026-10-08 alongside the file-upload path
 * (Lewis: "in addition to uploading files, can we also have a field to
 * paste in a url, for example to link to a cloud storage file"). No blob
 * storage involved at all — this just records the pasted URL directly,
 * same as the "legacy SharePoint link" ProjectDocument rows that predate
 * blobName (see ProjectDocument.blobName's doc comment in schema.prisma).
 * DocumentsService.getStandaloneDownloadUrl already handles a null
 * blobName by returning `doc.url` as-is, so no further change was needed
 * there — a linked document "downloads" by just opening the pasted URL. */
export class LinkStandaloneDocumentDto {
  @IsUrl({ require_protocol: true })
  url!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  // EVIDENCE | CONTROLLED_DOCUMENT | OTHER — same free-text convention as
  // ConfirmStandaloneUploadDto.type.
  @IsString()
  @IsNotEmpty()
  type!: string;
}
