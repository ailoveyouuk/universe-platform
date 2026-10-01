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
 *
 * `organizationPrimaryColor` (added 2026-09-26, see
 * Organization.primaryColor's doc comment) renders as a small accent bar
 * under the logo/name — deliberately the ONLY per-org theming here.
 * Universe keeps one consistent design language across every app; this is
 * just enough personalization (logo + a colour accent) for an org's
 * experience to feel like theirs, not a full reskin. AppShell separately
 * uses `organizationSecondaryColor` for its own sign-in/out button — see
 * each app's AppShell.tsx.
 */
export function OrgHeader({
  organizationName,
  organizationLogoUrl,
  organizationPrimaryColor,
}: {
  organizationName: string;
  organizationLogoUrl: string | null;
  organizationPrimaryColor?: string | null;
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
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--u-ink)" }}>{organizationName}</span>
      )}
      {organizationPrimaryColor && (
        <span
          style={{
            display: "block",
            width: 40,
            height: 3,
            borderRadius: 2,
            marginTop: 6,
            backgroundColor: organizationPrimaryColor,
          }}
        />
      )}
      <span style={{ fontSize: 11, color: "var(--u-ink-secondary)", marginTop: 4, letterSpacing: 0.2 }}>Powered by Universe</span>
    </div>
  );
}
