import { BadRequestException, Controller, Delete, Get, NotFoundException, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { BrandingService } from "./branding.service";
import { MAX_LOGO_BYTES } from "./logo-validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller()
export class BrandingController {
  constructor(private readonly branding: BrandingService) {}

  @Post("organizations/:id/logo")
  @UseGuards(EntraAuthGuard)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_LOGO_BYTES, files: 1 } }))
  upload(@CurrentUser() user: RequestUser, @Param("id") id: string, @UploadedFile() file: { buffer: Buffer; size: number } | undefined) {
    return this.branding.upload(user, id, file);
  }

  @Delete("organizations/:id/logo")
  @UseGuards(EntraAuthGuard)
  async remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    await this.branding.remove(user, id);
    return { ok: true };
  }

  /** Public, immutable, cacheable. See BrandingService. */
  @Get("branding/:orgId/logo/:file")
  async serve(@Param("orgId") orgId: string, @Param("file") file: string, @Res() res: Response) {
    if (!UUID.test(orgId)) throw new BadRequestException("Bad organisation id");
    const blob = await this.branding.read(orgId, file);
    if (!blob) throw new NotFoundException();
    res.set({
      "Content-Type": blob.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });
    res.send(blob.data);
  }
}
