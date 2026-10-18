import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";

export const PRODUCT_DOC_TYPES = ["CERTIFICATE", "IFU", "LABELLING", "SDS", "SPECIFICATION", "COA_TEMPLATE", "TEST_REPORT", "TECHNICAL_FILE", "OTHER"] as const;
/** Upload limits for controlled product documents (Cyber Essentials Plus: restrict accepted file types and sizes). */
export const PRODUCT_DOC_MAX_BYTES = 25 * 1024 * 1024;
export const PRODUCT_DOC_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export class RequestProductDocumentUploadDto {
  @IsString() @IsNotEmpty() fileName!: string;
  @IsString() @IsNotEmpty() contentType!: string;
  @IsInt() @Min(1) @Max(PRODUCT_DOC_MAX_BYTES) fileSizeBytes!: number;
}

export class CreateProductDocumentDto {
  @IsIn(PRODUCT_DOC_TYPES as unknown as string[]) docType!: string;
  @IsString() @IsNotEmpty() title!: string;
  @IsOptional() @IsString() version?: string;
  @IsOptional() @IsString() registrationId?: string;
  @IsOptional() @IsString() effectiveDate?: string;
  @IsOptional() @IsString() expiryDate?: string;
  @IsOptional() @IsString() reviewDueDate?: string;
  @IsOptional() @IsString() supersedesId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() blobName?: string;
  @IsOptional() @IsString() fileName?: string;
}
