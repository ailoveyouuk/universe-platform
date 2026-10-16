"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Subtle per-organization theming — wraps the signed-in area so an org's
 * own primaryColor/secondaryColor (already captured at onboarding, see
 * org-onboarding-data-model.md and OrgHeader.tsx's existing accent-bar use
 * of primaryColor) can tint a few specific, deliberately small surfaces:
 * the active sidebar item, the dashboard's greeting accent, and primary
 * buttons — WITHOUT overriding Universe's own brand-violet/accent-magenta
 * identity everywhere else. This is the same discipline OrgHeader already
 * established ("just enough personalization... not a full reskin"),
 * formalised as a context so Sidebar/Dashboard/Button don't each need the
 * org colours threaded through props individually.
 *
 * Falls back to Universe's own tokens when an org has no colours set
 * (most orgs today, per OrgHeader.tsx's doc comment) — never renders a
 * missing-colour gap.
 */
/** Black or white, whichever reads better on the given #RGB / #RRGGBB colour
 * (WCAG relative luminance). Returns null for anything that isn't a hex colour
 * so callers fall back to Universe's own tokens. */
export function readableTextOn(hex: string | null | undefined): string | null {
  if (!hex) return null;
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * lin(parseInt(h.slice(0, 2), 16)) + 0.7152 * lin(parseInt(h.slice(2, 4), 16)) + 0.0722 * lin(parseInt(h.slice(4, 6), 16));
  // Contrast against white is 1.05/(L+0.05); against black (L+0.05)/0.05.
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.05 ? "#FFFFFF" : "#111111";
}

export interface OrgThemeValue {
  primary: string | null;
  secondary: string | null;
}

const OrgThemeContext = createContext<OrgThemeValue>({ primary: null, secondary: null });

export function useOrgTheme(): OrgThemeValue {
  return useContext(OrgThemeContext);
}

export function OrgThemeProvider({
  primary,
  secondary,
  children,
}: {
  primary?: string | null;
  secondary?: string | null;
  children: ReactNode;
}) {
  const value = { primary: primary ?? null, secondary: secondary ?? null };
  return (
    <OrgThemeContext.Provider value={value}>
      <div
        style={
          {
            "--u-org-accent": value.primary ?? "var(--u-brand-violet)",
            "--u-org-accent-secondary": value.secondary ?? "var(--u-accent-magenta)",
            // Text that stays readable on top of the accent / secondary colour.
            "--u-org-accent-on": readableTextOn(value.primary) ?? "var(--u-brand-violet-on)",
            "--u-org-accent-secondary-on": readableTextOn(value.secondary) ?? "#FFFFFF",
            display: "contents",
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </OrgThemeContext.Provider>
  );
}
