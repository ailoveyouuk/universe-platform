"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountInfo } from "@azure/msal-browser";
import { DEFAULT_LOGIN_SCOPES } from "@universe/auth";
import type { AuthenticatedUser } from "@universe/types";
import { msalInstance } from "./msalInstance";
import { apiClient } from "./apiClient";

/**
 * Drives sign-in for the whole app — added 2026-09-26, replacing the
 * previous state of affairs where apiClient.ts could acquire a token but
 * nothing ever actually triggered a sign-in to produce an account for it to
 * find. Deliberately manual (no @azure/msal-react MsalProvider) to match
 * this codebase's existing style of calling msalInstance directly — see
 * apiClient.ts's getAccessToken.
 *
 * @azure/msal-browser v3 requires `initialize()` to resolve before ANY
 * other instance method is called (including getAllAccounts()) — skipping
 * this throws "uninitialized_public_client_application" at runtime. That
 * requirement, plus needing to complete any in-flight redirect first, is
 * why this all has to run once, here, before rendering anything that
 * depends on auth state.
 */
export type AuthStatus = "initializing" | "signedOut" | "unauthorized" | "signedIn";

export interface AuthState {
  status: AuthStatus;
  me: AuthenticatedUser | null;
  /** Set when status is "unauthorized" — e.g. the guard's "This Microsoft
   * account has not been added to Universe" message. Surfaced as-is rather
   * than a generic error, since it tells the person exactly what to do
   * (ask their admin to add them) — see EntraAuthGuard's doc comment. */
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
        // Token was valid (MSAL has an account) but the API rejected the
        // caller — not on the invite list, or deactivated. Not a sign-in
        // failure to retry; showing the sign-in button again would just
        // loop. See EntraAuthGuard.canActivate's ForbiddenException cases.
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
