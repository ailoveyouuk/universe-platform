'use client'

import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { InteractionStatus, InteractionRequiredAuthError } from '@azure/msal-browser'
import { useCallback, useEffect, useState } from 'react'
import { loginRequest, apiRequest } from './msal.config'
import { apiPost } from '@rc/api-client'
import { getEmployer, listEmployers, type EmployerSummary } from '../api/employerApi'
import type { EmployerUser, Employer } from '../data/types'

type PlatformRole = 'admin' | 'coordinator' | null

const SELECTED_EMPLOYER_KEY = 'rc-employer:selectedEmployerId'

interface EmployerAuthState {
  isAuthenticated: boolean
  user: EmployerUser | null
  employer: Employer | null
  isLoading: boolean
  notInvited: boolean
  // Global Admin/Coordinator — platform-wide RC staff, not scoped to any one
  // employer by default (see rc-api lib/auth.ts requireEmployerScope, which
  // already lets them read/write any employer once one is picked).
  isGlobalStaff: boolean
  // True once we know this account is global staff AND has no employer
  // selected yet — the gate shows the picker screen in this state instead of
  // "access not set up".
  needsOrgPicker: boolean
  availableEmployers: EmployerSummary[]
  selectEmployer: (employerId: string) => void
  clearEmployerSelection: () => void
  signIn: () => void
  signOut: () => void
}

// Employer access is invite-only (an rc_admin creates a StaffInvite for a
// named contact, scoped to one employer — see rc-api routes/auth.ts and
// routes/staffInvites.ts) — UNLESS the signed-in account is a Global Admin
// or Coordinator, who can view any employer and instead pick one from
// /api/admin/employers (rc-api enforces the actual read/write bypass; this
// app just needs to know which employer to display).
export function useEmployerAuth(): EmployerAuthState {
  const { instance, accounts, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const account = accounts[0] ?? null
  const isLoading = inProgress !== InteractionStatus.None

  const [user, setUser] = useState<EmployerUser | null>(null)
  const [employer, setEmployer] = useState<Employer | null>(null)
  const [notInvited, setNotInvited] = useState(false)
  const [registering, setRegistering] = useState(true)
  const [platformRole, setPlatformRole] = useState<PlatformRole>(null)
  const [ownEmployerId, setOwnEmployerId] = useState<string | null>(null)
  const [selectedEmployerId, setSelectedEmployerId] = useState<string | null>(null)
  const [availableEmployers, setAvailableEmployers] = useState<EmployerSummary[]>([])
  const [employerLoading, setEmployerLoading] = useState(false)

  const isGlobalStaff = platformRole === 'admin' || platformRole === 'coordinator'
  const activeEmployerId = ownEmployerId ?? selectedEmployerId
  const needsOrgPicker = isGlobalStaff && !ownEmployerId && !selectedEmployerId

  useEffect(() => {
    if (!isAuthenticated || !account) { setRegistering(false); return }
    let cancelled = false
    const register = async () => {
      setRegistering(true)
      try {
        await instance.acquireTokenSilent({ ...apiRequest, account })
        const result = await apiPost<{
          id: string; role: string; displayName: string; email: string
          employerId: string | null; platformRole: PlatformRole
        }>('/api/auth/register', {
          azureAdId:   account.localAccountId,
          email:       account.username,
          displayName: account.name ?? account.username,
          role:        'employer_admin',
        })
        if (cancelled) return
        if (result.error || !result.data) {
          setNotInvited(result.error?.code === 'NOT_INVITED')
          setUser(null)
          setOwnEmployerId(null)
          setPlatformRole(null)
          return
        }

        const staffTier = result.data.platformRole
        setPlatformRole(staffTier)
        setOwnEmployerId(result.data.employerId)

        if (!result.data.employerId && !(staffTier === 'admin' || staffTier === 'coordinator')) {
          // No employer of their own, and not global staff either —
          // genuinely not set up.
          setNotInvited(true)
          setUser(null)
          return
        }

        setNotInvited(false)
        setUser({
          id: result.data.id, name: result.data.displayName, email: result.data.email,
          employerId: result.data.employerId ?? '', jobTitle: '',
          role: result.data.role === 'employer_recruiter' ? 'recruiter' : 'admin',
        })

        if (staffTier === 'admin' || staffTier === 'coordinator') {
          const stored = typeof window !== 'undefined' ? window.localStorage.getItem(SELECTED_EMPLOYER_KEY) : null
          if (stored) setSelectedEmployerId(stored)
          listEmployers().then(list => { if (!cancelled) setAvailableEmployers(list) })
        }
      } catch (err) {
        // A cached account can go stale in a way silent auth can't repair
        // on its own — most commonly, an account cached under a previous
        // deploy's identity tenant/client (e.g. before this app moved onto
        // Entra External ID) sitting in this origin's shared MSAL cache
        // (accounts are shared per-origin across client IDs, not scoped to
        // one). acquireTokenSilent then fails with InteractionRequiredAuthError
        // rather than a network error — force a fresh interactive sign-in
        // so the account gets replaced with one valid for the current
        // authority, instead of leaving the user stuck on a half-signed-in
        // dashboard with no data. Any other failure (a real network blip)
        // just leaves state null — the gate below never renders the app
        // shell without a real user record either way.
        if (err instanceof InteractionRequiredAuthError) {
          instance.loginRedirect(loginRequest).catch(() => {})
          return
        }
      } finally {
        if (!cancelled) setRegistering(false)
      }
    }
    register()
    return () => { cancelled = true }
  }, [isAuthenticated, account, instance])

  // Fetch the actual Employer record whenever the active id changes — covers
  // both the normal (own employer) case and a global-staff pick.
  useEffect(() => {
    if (!activeEmployerId) { setEmployer(null); return }
    let cancelled = false
    setEmployerLoading(true)
    getEmployer(activeEmployerId).then(emp => {
      if (!cancelled) setEmployer(emp)
    }).finally(() => { if (!cancelled) setEmployerLoading(false) })
    return () => { cancelled = true }
  }, [activeEmployerId])

  const selectEmployer = useCallback((employerId: string) => {
    setSelectedEmployerId(employerId)
    try { window.localStorage.setItem(SELECTED_EMPLOYER_KEY, employerId) } catch { /* ignore */ }
  }, [])

  const clearEmployerSelection = useCallback(() => {
    setSelectedEmployerId(null)
    try { window.localStorage.removeItem(SELECTED_EMPLOYER_KEY) } catch { /* ignore */ }
  }, [])

  const signIn = () => {
    instance.loginRedirect(loginRequest).catch(console.error)
  }

  const signOut = () => {
    try { window.localStorage.removeItem(SELECTED_EMPLOYER_KEY) } catch { /* ignore */ }
    instance.logoutRedirect({ postLogoutRedirectUri: '/' }).catch(console.error)
  }

  return {
    isAuthenticated, user, employer,
    isLoading: isLoading || registering || employerLoading,
    notInvited, isGlobalStaff, needsOrgPicker, availableEmployers,
    selectEmployer, clearEmployerSelection,
    signIn, signOut,
  }
}
