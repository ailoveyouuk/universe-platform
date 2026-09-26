"use client";

import { useCallback, useEffect, useState } from "react";
import type { AccountInfo } from "@azure/msal-browser";
import { DEFAULT_LOGIN_SCOPES } from "@universe/auth";
import type { AuthenticatedUser } from "@universe/types";
import { msalInstance } from "./msalInstance";
import { apiClient } from "./apiClient";

/**
 * Drives sign-in for the whole Admin app — added 2026-09-26. Before this,
 * apps/admin had NO sign-in trigger anywhere: apiClient.ts could acquire a
 * token via acquireTokenSilent, but nothing ever called loginRedirect() to
 * produce an account for it to find in the first place, so every page's
 * apiClient.me()/listUsers()/etc call just failed with "Not signed in" and
 * there was no button to fix it. Found while investigating Lewis's question
 * about whether unapproved emails can get into the platform — they can't
 * (see EntraAuthGuard), but this meant nobody, including a real admin,
 * could actually sign into the live Admin app at all.
 *
 * Deliberately identical in shape to
 * apps/project-management/src/lib/useAuth.ts — same MSAL v3
 * initialize()-before-anything-else requirement, same redirect-handling
 * sequence, same unauthorized-vs-signedOut distinction.
 */
export type AuthStatus = "initializing" | "signedOut" | "unauthorized" | "signedIn";

export interface AuthState {
  status: AuthStatus;
  me: AuthenticatedUser | null;
  /** Set when status is "unauthorized" — e.g. the guard's "This Microsoft
   * account has not been added to Universe" message. */
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
