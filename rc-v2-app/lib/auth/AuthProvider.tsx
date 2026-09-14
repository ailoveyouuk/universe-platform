'use client'

import { MsalProvider } from '@azure/msal-react'
import { PublicClientApplication } from '@azure/msal-browser'
import { useEffect, useState } from 'react'
import { msalConfig, apiRequest, clearStaleAuthCacheIfNeeded } from './msalConfig'
import { configureApiClient } from '@rc/api-client'

let _msalInstance: PublicClientApplication | null = null
function getMsalInstance(): PublicClientApplication {
  if (!_msalInstance) {
    clearStaleAuthCacheIfNeeded()
    _msalInstance = new PublicClientApplication(msalConfig)
  }
  return _msalInstance
}

// Set once acquireTokenRedirect has been kicked off, so a run of failed
// getToken calls (one per in-flight request) doesn't fire it more than once
// per page load.
let redirecting = false

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [instance] = useState(() => getMsalInstance())

  useEffect(() => {
    configureApiClient({
      baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000',
      getToken: async () => {
        const accounts = instance.getAllAccounts()
        if (accounts.length === 0) return null
        try {
          const result = await instance.acquireTokenSilent({
            scopes:  apiRequest.scopes,
            account: accounts[0],
          })
          return result.accessToken
        } catch {
          // acquireTokenSilent's hidden-iframe flow gets blocked by Safari's
          // Intelligent Tracking Prevention far more often than desktop
          // Chrome — seen live as a signed-in phone session where every API
          // call quietly failed with no token ever sent. A real top-level
          // redirect isn't subject to the same iframe restriction, and
          // since the account is still signed in with Microsoft it
          // normally round-trips via SSO with no prompt at all.
          if (!redirecting) {
            redirecting = true
            instance.acquireTokenRedirect({ scopes: apiRequest.scopes, account: accounts[0] })
              .catch(() => { redirecting = false })
          }
          return null
        }
      },
    })
  }, [instance])

  return <MsalProvider instance={instance}>{children}</MsalProvider>
}
