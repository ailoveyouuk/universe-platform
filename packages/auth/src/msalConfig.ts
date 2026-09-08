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

/** Replace with the API's own exposed scope (e.g.
 * "api://<api-client-id>/access_as_user") once the Universe API's app
 * registration exists in the CIAM tenant — "User.Read" is a Microsoft Graph
 * scope and won't authorize calls to our own API. */
export const DEFAULT_LOGIN_SCOPES = ["openid", "profile", "email"];
