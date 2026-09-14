'use client'

import { useMemo } from 'react'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { loginRequest } from './msalConfig'
import type { RCUser } from '@/types'

// ─────────────────────────────────────────────────────────────────────────────
// useAuth — central hook for all authentication state and actions
// ─────────────────────────────────────────────────────────────────────────────

export function useAuth() {
  const { instance, accounts } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const account = accounts[0] ?? null

  // Memoized on the account's own stable string fields, not on `account`
  // itself — MSAL doesn't guarantee `accounts[0]` is referentially stable
  // across renders, and a fresh `user` object every render is exactly the
  // bug that was here before: LearnerContext depends on `user` in a
  // useEffect array, so a new object identity on every render re-ran that
  // effect every render, which called setLearnerId/setResolving, which
  // caused a re-render, which produced a new `user` object, which re-ran
  // the effect again — an infinite loop that fired /api/auth/register (and,
  // downstream, /api/learners/:id/access) continuously and never let the
  // module page's loading state settle.
  const accountId   = account?.localAccountId ?? null
  const accountUser = account?.username ?? null
  const accountName = account?.name ?? null
  const user: RCUser | null = useMemo(
    () => (accountId ? { id: accountId, email: accountUser ?? '', displayName: accountName ?? accountUser ?? '' } : null),
    [accountId, accountUser, accountName],
  )

  async function signIn() {
    try {
      await instance.loginRedirect(loginRequest)
    } catch (err) {
      console.error('Sign-in failed:', err)
    }
  }

  async function signOut() {
    try {
      await instance.logoutRedirect({
        postLogoutRedirectUri: '/',
      })
    } catch (err) {
      console.error('Sign-out failed:', err)
    }
  }

  // Get a fresh access token for API calls
  async function getAccessToken(): Promise<string | null> {
    if (!account) return null
    try {
      const result = await instance.acquireTokenSilent({
        scopes:  loginRequest.scopes ?? [],
        account,
      })
      return result.accessToken
    } catch {
      // Silent acquisition failed — fall back to a redirect. This navigates
      // away, so there's no result to return here; the caller re-runs once
      // the app reloads post-redirect and silent acquisition succeeds.
      try {
        await instance.acquireTokenRedirect(loginRequest)
        return null
      } catch (err) {
        console.error('Token acquisition failed:', err)
        return null
      }
    }
  }

  return { isAuthenticated, user, account, signIn, signOut, getAccessToken }
}
