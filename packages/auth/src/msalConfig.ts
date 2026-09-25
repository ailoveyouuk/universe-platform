import type { Configuration } from "@azure/msal-browser";

/**
 * Shared MSAL configuration used by every Next.js app in the platform,
 * pointed at the Universe CIAM tenant (Microsoft Entra External ID) — a
 * dedicated identity tenant for Universe — not tied to any one customer's
 * own corporate Entra ID. All Universe apps register against the SAME CIAM app,
 * so a user signed into one app is already signed into the others.
 *
 * Entra External ID uses a ciamlogin.com authority, not
 * login.microsoftonline.com — pass the tenant's subdomain (the part before
 * ".onmicrosoft.com" / ".ciamlogin.com"), not just the tenant ID, once the
 * real CIAM tenant exists.
 */
export function createMsalConfig(params: {
  clientId: string;
  tenantId: string;
  tenantSubdomain?: string;
  redirectUri: string;
}): Configuration {
  const authority = params.tenantSubdomain
    ? `https://${params.tenantSubdomain}.ciamlogin.com/${params.tenantId}`
    : `https://login.microsoftonline.com/${params.tenantId}`; // fallback for local dev before the CIAM tenant is provisioned

  return {
    auth: {
      clientId: params.clientId,
      authority,
      redirectUri: params.redirectUri,
    },
    cache: {
      cacheLocation: "sessionStorage",
      storeAuthStateInCookie: false,
    },
  };
}

/** OIDC login scopes only — these authenticate the user but do NOT
 * authorize calls to the Universe API (an access token minted for these
 * scopes carries the Microsoft Graph audience, not ours). Use these for
 * `loginRedirect`/`loginPopup`; use API_SCOPES below for
 * `acquireTokenSilent` calls that produce a token to send to the API. */
export const DEFAULT_LOGIN_SCOPES = ["openid", "profile", "email"];

/**
 * The Universe API's own exposed delegated scope, registered 2026-09-25 in
 * the real Universe CIAM tenant (universe-platform-api app registration,
 * client ID bf7f8f96-dc29-4754-b323-5a17058f5a1b, Application ID URI
 * api://bf7f8f96-dc29-4754-b323-5a17058f5a1b). universe-platform-web is
 * pre-authorized for this scope in that app registration's "Expose an API"
 * blade, so requesting it does not trigger a separate consent prompt.
 *
 * Use this (not DEFAULT_LOGIN_SCOPES) for `acquireTokenSilent` calls whose
 * result is sent as the bearer token to the Universe API — see
 * apps/admin/src/lib/apiClient.ts and
 * apps/project-management/src/lib/apiClient.ts. The resulting token's `aud`
 * claim matches UNIVERSE_CIAM_API_AUDIENCE on the API side (see
 * apps/api/src/auth/entra-auth.guard.ts).
 *
 * Hardcoded rather than read from a NEXT_PUBLIC_ env var here on purpose:
 * this file lives in a shared package (packages/auth), and Next.js only
 * reliably inlines NEXT_PUBLIC_ vars from within an app's own source tree
 * even when the package is transpiled — reading it here risked silently
 * resolving to undefined depending on the bundler. A client ID / scope URI
 * isn't secret (it's sent in every browser token request), so hardcoding it
 * is safe; update this constant if the API app registration is ever
 * recreated.
 */
export const API_SCOPES = ["api://bf7f8f96-dc29-4754-b323-5a17058f5a1b/access_as_user"];
