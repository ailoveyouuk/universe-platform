import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { withPlatformStaffContext, withTenantContext } from "@universe/db";
import { BlobStorageService } from "../documents/blob-storage.service";
import type { RequestUser } from "../auth/entra-auth.guard";
import { assertCanManageOrg } from "../common/authorization";
import { diffForAudit, recordFieldChanges } from "../common/audit-log";
import { MAX_ICON_BYTES, MAX_LOGO_BYTES, LOGO_FILE_PATTERN, detectLogoImage, logoBlobName, logoPath, ownLogoFile, type LogoKind } from "./logo-validation";

const FIELD: Record<LogoKind, "logoUrl" | "logoIconUrl"> = { logo: "logoUrl", icon: "logoIconUrl" };

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

  async upload(caller: RequestUser, organizationId: string, file: { buffer: Buffer; size: number } | undefined, kind: LogoKind = "logo"): Promise<{ logoUrl: string }> {
    const field = FIELD[kind];
    const maxBytes = kind === "icon" ? MAX_ICON_BYTES : MAX_LOGO_BYTES;
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    if (!file?.buffer?.length) throw new BadRequestException("Choose an image file to upload.");
    if (file.size > maxBytes) throw new BadRequestException(`The ${kind === "icon" ? "icon" : "logo"} must be ${maxBytes / 1024} KB or smaller.`);
    const image = detectLogoImage(file.buffer);
    if (!image) throw new BadRequestException("Logos must be PNG, JPEG, WebP or a plain SVG (no scripts).");

    const version = Date.now();
    const fileName = `${version}.${image.ext}`;
    const detected = kind;
    const logoUrl = logoPath(organizationId, version, image.ext, detected);

    const previous = await this.run(caller, organizationId, async (tx) => {
      const org = await tx.organization.findUnique({ where: { id: organizationId }, select: { [field]: true } });
      if (!org) throw new NotFoundException("Organisation not found");
      return (org as any)[field] as string | null;
    });

    await this.blobs.putBlob(organizationId, logoBlobName(fileName, kind), file.buffer, image.contentType);

    await this.run(caller, organizationId, async (tx) => {
      await tx.organization.update({ where: { id: organizationId }, data: { [field]: logoUrl } });
      await recordFieldChanges(tx, {
        organizationId,
        tableName: "organizations",
        recordId: organizationId,
        changedById: caller.id,
        changes: diffForAudit({ [field]: previous }, { [field]: logoUrl }, [field]),
        source: "API",
      });
    });

    const oldFile = ownLogoFile(previous, organizationId, kind);
    if (oldFile) await this.blobs.deleteBlob(organizationId, logoBlobName(oldFile, kind)).catch(() => undefined);
    return { logoUrl };
  }

  async remove(caller: RequestUser, organizationId: string, kind: LogoKind = "logo"): Promise<void> {
    const field = FIELD[kind];
    assertCanManageOrg(caller, organizationId, "org.profile.manage");
    const previous = await this.run(caller, organizationId, async (tx) => {
      const org = await tx.organization.findUnique({ where: { id: organizationId }, select: { [field]: true } });
      if (!org) throw new NotFoundException("Organisation not found");
      await tx.organization.update({ where: { id: organizationId }, data: { [field]: null } });
      await recordFieldChanges(tx, {
        organizationId,
        tableName: "organizations",
        recordId: organizationId,
        changedById: caller.id,
        changes: diffForAudit({ [field]: (org as any)[field] }, { [field]: null }, [field]),
        source: "API",
      });
      return (org as any)[field] as string | null;
    });
    const oldFile = ownLogoFile(previous, organizationId, kind);
    if (oldFile) await this.blobs.deleteBlob(organizationId, logoBlobName(oldFile, kind)).catch(() => undefined);
  }

  async read(organizationId: string, kind: LogoKind, file: string) {
    if (!LOGO_FILE_PATTERN.test(file)) return null;
    return this.blobs.readBlob(organizationId, logoBlobName(file, kind));
  }
}
