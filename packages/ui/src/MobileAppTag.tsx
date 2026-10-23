"use client";

import { UNIVERSE_APPS } from "./AppSwitcher";

/**
 * Names the current app in the header on phones and tablets (≤900px), where the
 * sidebar (and the tag it carries under the logo) is tucked away in the drawer.
 * Same pill as the sidebar's, so it reads as the same thing: a dot in the app's
 * own colour and its name. Hidden on desktop. The name truncates rather than
 * wrapping when space is tight.
 */
export function MobileAppTag({ currentApp }: { currentApp: string }) {
  const app = UNIVERSE_APPS.find((a) => a.key === currentApp);
  if (!app) return null;
  return (
    <span
      className="u-mobile-app-tag"
      aria-label={`You are in ${app.label}`}
      style={{
        alignItems: "center",
        gap: 6,
        padding: "3px 9px 3px 7px",
        borderRadius: 999,
        backgroundColor: `color-mix(in srgb, ${app.accent} 11%, transparent)`,
        border: `1px solid color-mix(in srgb, ${app.accent} 28%, transparent)`,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        lineHeight: 1.2,
        color: "var(--u-ink)",
        minWidth: 0,
        maxWidth: "100%",
        flexShrink: 1,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: app.accent, flexShrink: 0 }} />
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.label}</span>
    </span>
  );
}
