import { BadRequestException, Controller, Delete, Get, NotFoundException, Param, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { EntraAuthGuard } from "../auth/entra-auth.guard";
import type { RequestUser } from "../auth/entra-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { BrandingService } from "./branding.service";
import { MAX_LOGO_BYTES, LOGO_KINDS, type LogoKind } from "./logo-validation";

function parseKind(v: string | undefined): LogoKind {
  if (v === undefined || v === "") return "logo";
  if ((LOGO_KINDS as readonly string[]).includes(v)) return v as LogoKind;
  throw new BadRequestException("variant must be \"logo\" or \"icon\"");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller()
export class BrandingController {
  constructor(private readonly branding: BrandingService) {}

  @Post("organizations/:id/logo")
  @UseGuards(EntraAuthGuard)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_LOGO_BYTES, files: 1 } }))
  upload(@CurrentUser() user: RequestUser, @Param("id") id: string, @UploadedFile() file: { buffer: Buffer; size: number } | undefined, @Query("variant") variant?: string) {
    return this.branding.upload(user, id, file, parseKind(variant));
  }

  @Delete("organizations/:id/logo")
  @UseGuards(EntraAuthGuard)
  async remove(@CurrentUser() user: RequestUser, @Param("id") id: string, @Query("variant") variant?: string) {
    await this.branding.remove(user, id, parseKind(variant));
    return { ok: true };
  }

  /** Public, immutable, cacheable. See BrandingService. */
  @Get("branding/:orgId/:kind/:file")
  async serve(@Param("orgId") orgId: string, @Param("kind") kind: string, @Param("file") file: string, @Res() res: Response) {
    if (!UUID.test(orgId)) throw new BadRequestException("Bad organisation id");
    if (!(LOGO_KINDS as readonly string[]).includes(kind)) throw new NotFoundException();
    const blob = await this.branding.read(orgId, kind as LogoKind, file);
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
