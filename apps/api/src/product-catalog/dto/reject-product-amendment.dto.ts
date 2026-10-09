import { IsOptional, IsString } from "class-validator";

/**
 * POST /product-catalog/amendments/:id/reject body — see
 * ProductCatalogService.rejectAmendment()'s doc comment. notes is free
 * text explaining why, shown to the submitting organisation; optional
 * since a QA/RP reviewer isn't always required to give one, though the
 * frontend should encourage it.
 */
export class RejectProductAmendmentDto {
  @IsOptional() @IsString() notes?: string;
}
