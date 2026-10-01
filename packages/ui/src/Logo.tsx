import type { ReactNode } from "react";

/**
 * The Universe mark itself — top-left of every app shell, distinct from
 * OrgHeader (which shows the signed-in ORGANIZATION's own branding next to
 * it). Paths copied directly from the canonical Design System artifact's
 * Logos asset group (universe-mark-color.svg / universe-mark-white.svg),
 * not approximated — see universe-brand-identity.md "Logomark — the orbit
 * mark". `variant="mark"` is the small orbit glyph alone (used collapsed /
 * at small sizes); `variant="lockup"` adds the "universe" wordmark next to
 * it (used expanded).
 */
export function Logo({
  variant = "lockup",
  tone = "color",
  size = 28,
}: {
  variant?: "mark" | "lockup";
  tone?: "color" | "white";
  size?: number;
}): ReactNode {
  const ringColor = tone === "color" ? "#D6469A" : "#F0A8D2";
  const coreColor = tone === "color" ? "#4A2E8C" : "#FFFFFF";
  const textColor = tone === "color" ? "var(--u-ink)" : "#FFFFFF";

  const mark = (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden={variant === "lockup"}>
      <title>Universe</title>
      <circle cx="50" cy="50" r="38" fill="none" stroke={ringColor} strokeWidth="4" />
      <circle cx="84.44" cy="33.94" r="7" fill={ringColor} />
      <circle cx="50" cy="50" r="14" fill={coreColor} />
    </svg>
  );

  if (variant === "mark") return mark;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: size * 0.3 }}>
      {mark}
      <span
        style={{
          fontFamily: "var(--u-font-display)",
          fontWeight: 700,
          fontSize: size * 0.72,
          letterSpacing: -0.5,
          color: textColor,
        }}
      >
        universe
      </span>
    </span>
  );
}
