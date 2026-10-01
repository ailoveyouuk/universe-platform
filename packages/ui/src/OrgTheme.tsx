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
            display: "contents",
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </OrgThemeContext.Provider>
  );
}
