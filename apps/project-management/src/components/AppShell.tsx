"use client";

import type { ReactNode } from "react";
import { OrgHeader } from "@universe/ui";
import { AuthContext } from "../lib/AuthContext";
import { useAuth } from "../lib/useAuth";

const buttonStyle = {
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
 * Wraps every page in the app — added 2026-09-26 alongside useAuth() so
 * there's an actual sign-in entry point (there wasn't one before: apiClient
 * could acquire a token, but nothing ever triggered a sign-in to produce an
 * account for it to find). Also renders the personalized org header
 * (OrgHeader, @universe/ui) every authenticated page needs, and gates
 * page content behind sign-in so pages like ProjectsPage never call the API
 * before an account exists.
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
          <OrgHeader organizationName={me.organizationName} organizationLogoUrl={me.organizationLogoUrl} />
        ) : (
          <OrgHeader organizationName="Universe" organizationLogoUrl={null} />
        )}

        {status === "signedIn" && (
          <button onClick={signOut} style={buttonStyle}>
            Sign out
          </button>
        )}
        {status === "signedOut" && (
          <button onClick={signIn} style={buttonStyle}>
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
