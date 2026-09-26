import type { ReactNode } from "react";

/**
 * The personalized, per-tenant branding mark every Universe app shows in
 * its top-left corner — added 2026-09-26 so each organization's experience
 * feels like their own product, not a shared generic tool, while always
 * being honest that it's built on Universe underneath. See
 * Organization.logoUrl's doc comment in schema.prisma for where the data
 * comes from, and AuthenticatedUser.organizationName/organizationLogoUrl
 * (@universe/types) for the shape every app's /me call returns.
 *
 * `organizationLogoUrl` is preferred when set; most organizations won't
 * have one yet (there's no upload flow as of 2026-09-26 — set directly in
 * the database for now), so falling back to the organization's name in
 * text is the common case, not an edge case, and needs to look
 * intentional rather than like a missing image.
 */
export function OrgHeader({
  organizationName,
  organizationLogoUrl,
}: {
  organizationName: string;
  organizationLogoUrl: string | null;
}): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
      {organizationLogoUrl ? (
        <img
          src={organizationLogoUrl}
          alt={organizationName}
          style={{ height: 32, width: "auto", display: "block" }}
        />
      ) : (
        <span style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{organizationName}</span>
      )}
      <span style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, letterSpacing: 0.2 }}>Powered by Universe</span>
    </div>
  );
}
