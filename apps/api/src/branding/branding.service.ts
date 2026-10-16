import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { withPlatformStaffContext, withTenantContext } from "@universe/db";
import { BlobStorageService } from "../documents/blob-storage.service";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertCanManageOrg } from "../common/authorization";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
import { MAX_LOGO_BYTES, LOGO_FILE_PATTERN, detectLogoImage, logoBlobName, logoPath, ownLogoFile } from "./logo-validation";

/**
 * Organisation logos. Stored in the organisation's own private blob container
 * (same isolation as documents) and served back through GET
 * /branding/:orgId/logo/:file, which is deliberately unauthenticated — a logo
 * is branding, and the sign-in screen needs it before anyone is signed in.
 * Only the logo of one organisation per URL is ever exposed, and the URL
 * contains an unguessable version, so this does not enumerate tenants.
 */
@Injectable()
export class BrandingService {
  constructor(private readonly blobs: BlobStorageService) {}

  private run<T>(caller: RequestUser, organizationId: string, fn: (tx: any) => Promise<T>): Promise<T> {
    return caller.platformStaffRole !== "NONE" ? withPlatformStaffContext(fn) : withTenantContext(organizationId, fn);
  }

  async upload(caller: RequestUser, organizationId: string, file: { buffer: Buffer; size: number } | undefined): Promise<{ logoUrl: string }> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    if (!file?.buffer?.length) throw new BadRequestException("Choose an image file to upload.");
    if (file.size > MAX_LOGO_BYTES) throw new BadRequestException("The logo must be 512 KB or smaller.");
    const kind = detectLogoImage(file.buffer);
    if (!kind) throw new BadRequestException("Logos must be PNG, JPEG, WebP or a plain SVG (no scripts).");

    const version = Date.now();
    const fileName = `${version}.${kind.ext}`;
    const logoUrl = logoPath(organizationId, version, kind.ext);

    const previous = await this.run(caller, organizationId, async (tx) => {
      const org = await tx.organization.findUnique({ where: { id: organizationId }, select: { logoUrl: true } });
      if (!org) throw new NotFoundException("Organisation not found");
      return org.logoUrl as string | null;
    });

    await this.blobs.putBlob(organizationId, logoBlobName(fileName), file.buffer, kind.contentType);

    await this.run(caller, organizationId, async (tx) => {
      await tx.organization.update({ where: { id: organizationId }, data: { logoUrl } });
      await recordFieldChanges(tx, {
        organizationId,
        tableName: "organizations",
        recordId: organizationId,
        changedById: caller.id,
        changes: diffForAudit({ logoUrl: previous }, { logoUrl }, ["logoUrl"]),
        source: "API",
      });
    });

    const oldFile = ownLogoFile(previous, organizationId);
    if (oldFile) await this.blobs.deleteBlob(organizationId, logoBlobName(oldFile)).catch(() => undefined);
    return { logoUrl };
  }

  async remove(caller: RequestUser, organizationId: string): Promise<void> {
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const previous = await this.run(caller, organizationId, async (tx) => {
      const org = await tx.organization.findUnique({ where: { id: organizationId }, select: { logoUrl: true } });
      if (!org) throw new NotFoundException("Organisation not found");
      await tx.organization.update({ where: { id: organizationId }, data: { logoUrl: null } });
      await recordFieldChanges(tx, {
        organizationId,
        tableName: "organizations",
        recordId: organizationId,
        changedById: caller.id,
        changes: diffForAudit({ logoUrl: org.logoUrl }, { logoUrl: null }, ["logoUrl"]),
        source: "API",
      });
      return org.logoUrl as string | null;
    });
    const oldFile = ownLogoFile(previous, organizationId);
    if (oldFile) await this.blobs.deleteBlob(organizationId, logoBlobName(oldFile)).catch(() => undefined);
  }

  async read(organizationId: string, file: string) {
    if (!LOGO_FILE_PATTERN.test(file)) return null;
    return this.blobs.readBlob(organizationId, logoBlobName(file));
  }
}
