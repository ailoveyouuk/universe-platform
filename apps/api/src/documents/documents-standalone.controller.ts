import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { RequestUploadDto } from "./dto/request-upload.dto";
import { ConfirmStandaloneUploadDto } from "./dto/confirm-standalone-upload.dto";
import { DocumentsService } from "./documents.service";

/**
 * Standalone (non-project) documents — added 2026-10-08 so a
 * StakeholderEvidenceRecord (and, in future, a ControlledDocument) can
 * carry a real uploaded file instead of metadata alone. Same two-step
 * SAS upload flow as DocumentsController, just without a projectId in
 * the path — see DocumentsService's "Standalone documents" section for
 * what actually differs (nothing but the ownership check).
 *
 * Kept as a sibling controller rather than adding optional-projectId
 * routes to DocumentsController, so the project-scoped routes' path
 * shape (and their ownership assertions) stay exactly as they were —
 * no risk of a project-scoped call silently taking the standalone path
 * or vice versa.
 */
@Controller("documents")
@UseGuards(EntraAuthGuard)
export class DocumentsStandaloneController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post("upload-url")
  requestUpload(@CurrentUser() user: RequestUser, @Body() dto: RequestUploadDto) {
    return this.documentsService.requestStandaloneUpload(user, dto);
  }

  @Post()
  confirmUpload(@CurrentUser() user: RequestUser, @Body() dto: ConfirmStandaloneUploadDto) {
    return this.documentsService.confirmStandaloneUpload(user, dto);
  }

  @Get(":documentId/download-url")
  getDownloadUrl(@CurrentUser() user: RequestUser, @Param("documentId") documentId: string) {
    return this.documentsService.getStandaloneDownloadUrl(user, documentId);
  }

  @Delete(":documentId")
  delete(@CurrentUser() user: RequestUser, @Param("documentId") documentId: string) {
    return this.documentsService.deleteStandalone(user, documentId);
  }
}
