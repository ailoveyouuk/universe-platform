// Entra External ID (CIAM) — the same identity tenant already used for the
// learner app, so employer contacts aren't limited to having a
// Microsoft/workforce account we've added as a guest in our own tenant.
// This is a build-time switch, not a runtime one: rc-employer is a
// static export (no server to decide this per-request), so which identity
// tenant it points at is fixed at build time by whichever env vars are
// present in that deploy's environment — same pattern as rc-v2-app's
// msalConfig.ts. No deploy sets these three vars today, so `ciamConfigured`
// is false everywhere in production right now and everything below
// resolves exactly as it did before this was added.
const ciamDomain   = process.env.NEXT_PUBLIC_AZURE_CIAM_DOMAIN ?? ''
const ciamTenantId = process.env.NEXT_PUBLIC_AZURE_CIAM_TENANT_ID ?? ''
const ciamClientId = process.env.NEXT_PUBLIC_AZURE_CIAM_CLIENT_ID ?? ''
const ciamConfigured = Boolean(ciamDomain && ciamTenantId && ciamClientId)

const workforceClientId = process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID ?? ''
const workforceTenantId = process.env.NEXT_PUBLIC_AZURE_AD_TENANT_ID ?? 'common'

const clientId  = ciamConfigured ? ciamClientId : workforceClientId
// CIAM's authority is its own custom domain (e.g. "<tenant>.ciamlogin.com"),
// not login.microsoftonline.com — see rc-api/src/config.ts's azureCiam
// block for the matching backend-side issuer/audience shape.
const authority = ciamConfigured
  ? `https://${ciamDomain}/${ciamTenantId}`
  : `https://login.microsoftonline.com/${workforceTenantId}`

export const msalConfig = {
  auth: {
    clientId,
    authority,
    redirectUri: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002',
  },
  cache: {
    cacheLocation:          'localStorage' as const, // persists across tabs
    storeAuthStateInCookie: true,                    // required for Safari ITP redirect flow
  },
}

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
}

export const apiRequest = {
  scopes: [`api://${clientId}/access_as_user`],
}

// MSAL's localStorage cache is shared per *origin* across every client ID
// that's ever authenticated there — it's not scoped to "this app's current
// config". So if the identity provider/client this app points at ever
// changes (a CIAM rollout, an app-registration rotation, swapping tenants),
// a browser that used the old config still has an account cached that
// looks "signed in" — acquireTokenSilent then fails against the new
// authority, and without this, the only thing catching that is
// useEmployerAuth's reactive InteractionRequiredAuthError handling. This runs
// earlier and proactively: stamp which clientId's cache is currently
// stored, and if that stamp doesn't match this build's clientId, sweep
// everything except this app's own (non-MSAL) keys before MSAL/the
// PublicClientApplication ever reads the stale cache.
const CACHE_STAMP_KEY = 'rc-auth:clientId'
const OWN_KEYS = new Set(['rc-employer:selectedEmployerId', CACHE_STAMP_KEY])

export function clearStaleAuthCacheIfNeeded(): void {
  if (typeof window === 'undefined') return
  try {
    const stamped = window.localStorage.getItem(CACHE_STAMP_KEY)
    if (stamped === clientId) return
    if (stamped !== null) {
      Object.keys(window.localStorage)
        .filter(k => !OWN_KEYS.has(k))
        .forEach(k => window.localStorage.removeItem(k))
    }
    window.localStorage.setItem(CACHE_STAMP_KEY, clientId)
  } catch {
    // localStorage unavailable (private browsing, etc) — the reactive
    // fallback in useEmployerAuth still covers the stale-account case.
  }
}
