"use client";

import type { ReactNode } from "react";
import { OrgHeader } from "@universe/ui";
import { AuthContext } from "../lib/AuthContext";
import { useAuth } from "../lib/useAuth";

const defaultButtonStyle = {
  padding: "6px 16px",
  fontSize: 14,
  fontWeight: 600,
  color: "#fff",
  backgroundColor: "#111827",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
} as const;

/**
 * Wraps every Admin page — added 2026-09-26, mirroring
 * apps/project-management/src/components/AppShell.tsx exactly (same
 * useAuth()/AuthContext pattern), since the Admin app previously had no
 * sign-in flow at all. Gates every page behind sign-in so a page never
 * calls the API before an account exists, and shares the single /me
 * response with every page via AuthContext instead of each page fetching
 * it again itself.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { status, me, error, signIn, signOut } = useAuth();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 32px",
          borderBottom: "1px solid #E5E7EB",
        }}
      >
        {status === "signedIn" && me ? (
          <OrgHeader
            organizationName={me.organizationName}
            organizationLogoUrl={me.organizationLogoUrl}
            organizationPrimaryColor={me.organizationPrimaryColor}
          />
        ) : (
          <OrgHeader organizationName="Universe Admin" organizationLogoUrl={null} />
        )}

        {status === "signedIn" && (
          <button
            onClick={signOut}
            style={{
              ...defaultButtonStyle,
              // Per-org accent (added 2026-09-26) — falls back to
              // Universe's own default when the org has no
              // secondaryColor set. See OrgHeader.tsx for the matching
              // primaryColor accent bar.
              backgroundColor: me?.organizationSecondaryColor ?? defaultButtonStyle.backgroundColor,
            }}
          >
            Sign out
          </button>
        )}
        {status === "signedOut" && (
          <button onClick={signIn} style={defaultButtonStyle}>
            Sign in
          </button>
        )}
      </header>

      <main style={{ flex: 1 }}>
        {status === "initializing" && <p style={{ padding: 32 }}>Loading…</p>}

        {status === "unauthorized" && (
          <div style={{ padding: 32 }}>
            <p style={{ color: "#B91C1C" }}>{error}</p>
          </div>
        )}

        {status === "signedOut" && (
          <div style={{ padding: 32 }}>
            <p>Please sign in to continue.</p>
          </div>
        )}

        {status === "signedIn" && me && <AuthContext.Provider value={me}>{children}</AuthContext.Provider>}
      </main>
    </div>
  );
}
