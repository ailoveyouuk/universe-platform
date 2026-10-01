import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import type { RequestUser } from "../auth/entra-auth.guard";
import { RequestUploadDto } from "./dto/request-upload.dto";
import { ConfirmUploadDto } from "./dto/confirm-upload.dto";
import { DocumentsService } from "./documents.service";

@Controller("projects/:projectId/documents")
@UseGuards(EntraAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post("upload-url")
  requestUpload(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Body() dto: RequestUploadDto) {
    return this.documentsService.requestUpload(user, projectId, dto);
  }

  @Post()
  confirmUpload(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Body() dto: ConfirmUploadDto) {
    return this.documentsService.confirmUpload(user, projectId, dto);
  }

  @Get(":documentId/download-url")
  getDownloadUrl(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Param("documentId") documentId: string) {
    return this.documentsService.getDownloadUrl(user, projectId, documentId);
  }

  @Delete(":documentId")
  delete(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Param("documentId") documentId: string) {
    return this.documentsService.delete(user, projectId, documentId);
  }
}
