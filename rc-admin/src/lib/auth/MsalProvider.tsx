'use client'

import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider as AzureMsalProvider } from '@azure/msal-react'
import { useEffect, useState } from 'react'
import { msalConfig, apiRequest } from './msal.config'
import { configureApiClient } from '@rc/api-client'

// ── MsalProvider ─────────────────────────────────────────────────────────────
// MSAL Browser v3 requires initialize() AND handleRedirectPromise() to be
// awaited before mounting the provider. initialize() alone doesn't guarantee
// inProgress resets to None — handleRedirectPromise() flushes the redirect
// state fully, preventing a stuck HandleRedirect spinner.

export function MsalProvider({ children }: { children: React.ReactNode }) {
  const [instance, setInstance] = useState<PublicClientApplication | null>(null)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    // Clear stale MSAL interaction-status flags left by interrupted sessions.
    try {
      Object.keys(sessionStorage)
        .filter(k => k.includes('interaction.status'))
        .forEach(k => sessionStorage.removeItem(k))
    } catch { /* sessionStorage may be blocked in private browsing */ }

    const pca = new PublicClientApplication(msalConfig)

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('MSAL init timed out after 8s')), 8000)
    )

    Promise.race([
      pca.initialize().then(() => pca.handleRedirectPromise()),
      timeout,
    ])
      .then(() => {
        // acquireTokenSilent's hidden-iframe flow gets blocked by Safari's
        // Intelligent Tracking Prevention (third-party storage access) far
        // more often than desktop Chrome — seen live as a signed-in phone
        // session where every API call quietly failed with no token ever
        // sent. storeAuthStateInCookie above exists for exactly this: a
        // real top-level redirect isn't subject to the same iframe
        // restriction, and since the account is still signed in with
        // Microsoft it normally round-trips via SSO with no prompt at all.
        // `redirecting` just stops it firing more than once per page load
        // if the redirect itself keeps failing.
        let redirecting = false
        configureApiClient({
          baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000',
          getToken: async () => {
            const accounts = pca.getAllAccounts()
            if (accounts.length === 0) return null
            try {
              const result = await pca.acquireTokenSilent({
                scopes:  apiRequest.scopes,
                account: accounts[0],
              })
              return result.accessToken
            } catch {
              if (!redirecting) {
                redirecting = true
                pca.acquireTokenRedirect({ scopes: apiRequest.scopes, account: accounts[0] })
                  .catch(() => { redirecting = false })
              }
              return null
            }
          },
        })
        setInstance(pca)
      })
      .catch((err: unknown) => {
        console.error('MSAL init failed:', err)
        if (err instanceof Error && err.message.includes('timed out')) {
          configureApiClient({
            baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000',
            getToken: async () => null,
          })
          setInstance(pca)
        } else {
          setInitError(err instanceof Error ? err.message : 'Auth initialisation failed')
        }
      })
  }, [])

  if (initError) {
    return (
      <div className="flex h-screen items-center justify-center bg-adm-page">
        <p className="text-sm text-red-400">Sign-in unavailable: {initError}</p>
      </div>
    )
  }

  if (!instance) {
    return (
      <div className="flex h-screen items-center justify-center bg-adm-page">
        <div className="w-6 h-6 border-2 border-rc-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <AzureMsalProvider instance={instance}>{children}</AzureMsalProvider>
}
