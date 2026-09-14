'use client'

import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { useEffect, useState } from 'react'
import { loginRequest, apiRequest } from './msal.config'
import { apiPost } from '@rc/api-client'
import type { AdminUser } from '../data/types'

interface AdminAuthState {
  isAuthenticated: boolean
  user: AdminUser | null
  isLoading: boolean
  notInvited: boolean
  signIn: () => void
  signOut: () => void
}

// The role/institutionId/employerId the server actually applies always come
// from the register() response — never guessed locally — because access is
// invite-only (see rc-api routes/auth.ts + routes/staffInvites.ts): a
// Microsoft sign-in alone doesn't tell us who someone is on this platform.
export function useAdminAuth(): AdminAuthState {
  const { instance, accounts, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const account = accounts[0] ?? null
  const isLoading = inProgress !== InteractionStatus.None

  const [user, setUser] = useState<AdminUser | null>(null)
  const [notInvited, setNotInvited] = useState(false)
  const [registering, setRegistering] = useState(true)

  useEffect(() => {
    if (!isAuthenticated || !account) { setRegistering(false); return }
    let cancelled = false
    const register = async () => {
      setRegistering(true)
      try {
        await instance.acquireTokenSilent({ ...apiRequest, account })
        const result = await apiPost<{ id: string; role: string; displayName: string; email: string }>('/api/auth/register', {
          azureAdId:   account.localAccountId,
          email:       account.username,
          displayName: account.name ?? account.username,
          role:        'rc_admin',
        })
        if (cancelled) return
        if (result.error || !result.data) {
          setNotInvited(result.error?.code === 'NOT_INVITED')
          setUser(null)
        } else {
          setNotInvited(false)
          setUser({
            id: result.data.id, name: result.data.displayName, email: result.data.email,
            role: result.data.role as AdminUser['role'],
          })
        }
      } catch {
        // Network/token failure — leave user null, don't claim NOT_INVITED.
      } finally {
        if (!cancelled) setRegistering(false)
      }
    }
    register()
    return () => { cancelled = true }
  }, [isAuthenticated, account, instance])

  const signIn = () => {
    instance.loginRedirect(loginRequest).catch(console.error)
  }

  const signOut = () => {
    instance.logoutRedirect({ postLogoutRedirectUri: '/' }).catch(console.error)
  }

  return { isAuthenticated, user, isLoading: isLoading || registering, notInvited, signIn, signOut }
}
