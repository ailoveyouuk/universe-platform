import { Configuration, RedirectRequest, LogLevel } from '@azure/msal-browser'

// Entra External ID (CIAM) — the learner-facing identity tenant agreed
// alongside institution-aware branding, so learners aren't limited to
// having a Microsoft/workforce account. This is a build-time switch, not a
// runtime one: rc-v2-app is a static export (no server to decide this
// per-request), so which identity tenant it points at is fixed at build
// time by whichever env vars are present in that deploy's environment —
// same pattern as NEXT_PUBLIC_BRAND in @rc/theme. No deploy sets these
// three vars today, so `ciamConfigured` is false everywhere in production
// right now and every line below resolves EXACTLY as it did before this
// was added — nothing here changes current behaviour.
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

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority,
    // Point to /login not root — the root page immediately redirects to /dashboard,
    // stripping the auth hash before MSAL can process it (breaks Safari redirect fallback).
    redirectUri:           typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login',
    postLogoutRedirectUri: '/',
  },
  cache: {
    cacheLocation:          'sessionStorage',
    // Needed so acquireTokenRedirect's state survives the round trip to
    // login.microsoftonline.com under Safari ITP — see AuthProvider.tsx's
    // getToken for why that fallback exists at all.
    storeAuthStateInCookie: true,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
        if (containsPii) return
        if (process.env.NODE_ENV === 'development') {
          switch (level) {
            case LogLevel.Error:   console.error(message); break
            case LogLevel.Warning: console.warn(message);  break
            default:               console.info(message)
          }
        }
      },
    },
  },
}

export const loginRequest: RedirectRequest = {
  scopes: ['openid', 'profile', 'email'],
}

// NOTE: this scope URI format (`api://<clientId>/...`) is the workforce
// tenant's convention. CIAM scopes are typically exposed the same way on
// an app registration's "Expose an API" blade, but this hasn't been
// verified against a real CIAM tenant yet — confirm/adjust once one
// exists (Phase 03 of the setup runbook) rather than trust this blindly.
export const apiRequest = {
  scopes: [`api://${clientId}/access_as_user`],
}

// This app's cache lives in sessionStorage (not localStorage — see
// cacheLocation above), so a stale cross-deploy account mostly can't
// survive here the way it can for rc-institution/rc-employer (a closed
// tab clears it). But within one still-open tab across a deploy, the same
// class of problem applies: MSAL's cache is shared per origin across
// every client ID that's ever authenticated there, so if this app's
// identity provider/client ever changes (a CIAM rollout, an
// app-registration rotation), an account cached under the old config
// would otherwise still look "signed in" against the new one. Stamp which
// clientId's cache is currently stored, and if it doesn't match this
// build's clientId, sweep everything before the PublicClientApplication
// in AuthProvider.tsx ever reads it.
const CACHE_STAMP_KEY = 'rc-auth:clientId'

export function clearStaleAuthCacheIfNeeded(): void {
  if (typeof window === 'undefined') return
  try {
    const stamped = window.sessionStorage.getItem(CACHE_STAMP_KEY)
    if (stamped === clientId) return
    if (stamped !== null) {
      Object.keys(window.sessionStorage)
        .filter(k => k !== CACHE_STAMP_KEY)
        .forEach(k => window.sessionStorage.removeItem(k))
    }
    window.sessionStorage.setItem(CACHE_STAMP_KEY, clientId)
  } catch {
    // sessionStorage unavailable (private browsing, etc) — AuthProvider's
    // own acquireTokenRedirect fallback on a failed silent call still
    // covers the stale-account case.
  }
}
