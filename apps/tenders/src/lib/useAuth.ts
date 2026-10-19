"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountInfo } from "@azure/msal-browser";
import { DEFAULT_LOGIN_SCOPES } from "@universe/auth";
import type { AuthenticatedUser } from "@universe/types";
import { msalInstance } from "./msalInstance";
import { apiClient } from "./apiClient";

/** Identical to apps/project-management/src/lib/useAuth.ts — see that
 * file's doc comment for the full rationale (manual MSAL init/redirect
 * handling, no MsalProvider). Kept duplicated rather than shared across
 * apps for now, consistent with how admin/project-management already each
 * have their own copy — not worth a shared package for four files until a
 * third near-identical copy makes the pattern undeniable. */
export type AuthStatus = "initializing" | "signedOut" | "unauthorized" | "signedIn";

export interface AuthState {
  status: AuthStatus;
  me: AuthenticatedUser | null;
  error: string | null;
  signIn: () => void;
  signOut: () => void;
}

export function useAuth(): AuthState {
  const [status, setStatus] = useState<AuthStatus>("initializing");
  const [me, setMe] = useState<AuthenticatedUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      await msalInstance.initialize();
      const redirectResult = await msalInstance.handleRedirectPromise().catch(() => null);
      const account: AccountInfo | null = redirectResult?.account ?? msalInstance.getAllAccounts()[0] ?? null;

      if (!account) {
        if (!cancelled) setStatus("signedOut");
        return;
      }
      msalInstance.setActiveAccount(account);

      try {
        const profile = await apiClient.me();
        if (cancelled) return;
        setMe(profile);
        setStatus("signedIn");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Sign-in failed");
        setStatus("unauthorized");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(() => {
    void msalInstance.loginRedirect({ scopes: DEFAULT_LOGIN_SCOPES });
  }, []);

  const signOut = useCallback(() => {
    void msalInstance.logoutRedirect();
  }, []);

  return { status, me, error, signIn, signOut };
}
