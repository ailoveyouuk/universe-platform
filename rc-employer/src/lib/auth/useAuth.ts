'use client'

import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { useEffect } from 'react'
import { loginRequest, apiRequest } from './msal.config'
import { apiPost } from '@rc/api-client'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  displayName: string | null
  email: string | null
  accountId: string | null
  signIn: () => void
  signOut: () => void
}

export function useAuth(): AuthState {
  const { instance, accounts, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const account = accounts[0] ?? null
  const isLoading = inProgress !== InteractionStatus.None

  useEffect(() => {
    if (!isAuthenticated || !account) return
    const register = async () => {
      try {
        await instance.acquireTokenSilent({ ...apiRequest, account })
        await apiPost('/api/auth/register', {
          azureAdId:   account.localAccountId,
          email:       account.username,
          displayName: account.name ?? account.username,
          role:        'employer_admin',
        })
      } catch {
        // silent failure — user still sees the app
      }
    }
    register()
  }, [isAuthenticated, account, instance])

  const signIn = () => {
    instance.loginRedirect(loginRequest).catch(console.error)
  }

  const signOut = () => {
    instance.logoutRedirect({ postLogoutRedirectUri: '/' }).catch(console.error)
  }

  return {
    isAuthenticated,
    isLoading,
    displayName: account?.name ?? null,
    email:       account?.username ?? null,
    accountId:   account?.localAccountId ?? null,
    signIn,
    signOut,
  }
}
