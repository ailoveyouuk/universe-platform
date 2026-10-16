export const MAX_LOGO_BYTES = 512 * 1024;

export interface DetectedImage {
  ext: "png" | "jpg" | "webp" | "svg";
  contentType: string;
}

/** Identifies an image by its bytes (never by the client-declared type or
 * file name) and returns null if it isn't an allowed logo format. SVGs are
 * accepted only if they contain no script, event handlers or external
 * references — they're also served sandboxed, so this is belt and braces. */
export function detectLogoImage(buf: Buffer): DetectedImage | null {
  if (buf.length < 12) return null;
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", contentType: "image/png" };
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", contentType: "image/jpeg" };
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return { ext: "webp", contentType: "image/webp" };
  const head = buf.subarray(0, Math.min(buf.length, 2048)).toString("utf8").trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) {
    const text = buf.toString("utf8").toLowerCase();
    if (/<script|<foreignobject|\son[a-z]+\s*=|javascript:|<iframe|<embed|<object|xlink:href\s*=\s*["']\s*(https?:|data:text)/.test(text)) return null;
    return { ext: "svg", contentType: "image/svg+xml" };
  }
  return null;
}

export type LogoKind = "logo" | "icon";
export const LOGO_KINDS: readonly LogoKind[] = ["logo", "icon"];
export const MAX_ICON_BYTES = 256 * 1024;

/** The path stored in Organization.logoUrl / logoIconUrl for an uploaded
 * image. The version (timestamp) lives in the path, so each upload is a new
 * immutable URL. */
export function logoPath(organizationId: string, version: number, ext: string, kind: LogoKind = "logo"): string {
  return `/branding/${organizationId}/${kind}/${version}.${ext}`;
}

export const LOGO_FILE_PATTERN = /^[0-9]{10,16}\.(png|jpg|webp|svg)$/;

/** Blob name for a stored file. Logos keep their original names; icons are prefixed. */
export function logoBlobName(file: string, kind: LogoKind = "logo"): string {
  return kind === "icon" ? `branding/icon-${file}` : `branding/${file}`;
}

/** If a stored url is one of our own uploaded paths, the file name part. */
export function ownLogoFile(url: string | null | undefined, organizationId: string, kind: LogoKind = "logo"): string | null {
  if (!url) return null;
  const m = new RegExp(`^/branding/${organizationId}/${kind}/([^/]+)$`).exec(url);
  return m && LOGO_FILE_PATTERN.test(m[1]) ? m[1] : null;
}
