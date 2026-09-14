'use client'

import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { InteractionStatus, InteractionRequiredAuthError } from '@azure/msal-browser'
import { useCallback, useEffect, useState } from 'react'
import { loginRequest, apiRequest } from './msal.config'
import { apiPost } from '@rc/api-client'
import { getInstitution, listInstitutions, type InstitutionSummary } from '../api/institutionApi'
import type { InstitutionUser, Institution } from '../data/types'

type PlatformRole = 'admin' | 'coordinator' | null

const SELECTED_INSTITUTION_KEY = 'rc-institution:selectedInstitutionId'

interface InstitutionAuthState {
  isAuthenticated: boolean
  user: InstitutionUser | null
  institution: Institution | null
  isLoading: boolean
  notInvited: boolean
  // Global Admin/Coordinator — platform-wide RC staff, not scoped to any one
  // institution by default (see rc-api lib/auth.ts requireInstitutionScope,
  // which already lets them read/write any institution once one is picked).
  isGlobalStaff: boolean
  // True once we know this account is global staff AND has no institution
  // selected yet — the gate shows the picker screen in this state instead of
  // "access not set up".
  needsOrgPicker: boolean
  availableInstitutions: InstitutionSummary[]
  selectInstitution: (institutionId: string) => void
  clearInstitutionSelection: () => void
  signIn: () => void
  signOut: () => void
}

// Institution access is invite-only (an rc_admin creates a StaffInvite for a
// named contact, scoped to one institution — see rc-api routes/auth.ts and
// routes/staffInvites.ts) — UNLESS the signed-in account is a Global Admin
// or Coordinator, who can view any institution and instead pick one from
// /api/admin/institutions (rc-api enforces the actual read/write bypass;
// this app just needs to know which institution to display).
export function useInstitutionAuth(): InstitutionAuthState {
  const { instance, accounts, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const account = accounts[0] ?? null
  const isLoading = inProgress !== InteractionStatus.None

  const [user, setUser] = useState<InstitutionUser | null>(null)
  const [institution, setInstitution] = useState<Institution | null>(null)
  const [notInvited, setNotInvited] = useState(false)
  const [registering, setRegistering] = useState(true)
  const [platformRole, setPlatformRole] = useState<PlatformRole>(null)
  const [ownInstitutionId, setOwnInstitutionId] = useState<string | null>(null)
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null)
  const [availableInstitutions, setAvailableInstitutions] = useState<InstitutionSummary[]>([])
  const [institutionLoading, setInstitutionLoading] = useState(false)

  const isGlobalStaff = platformRole === 'admin' || platformRole === 'coordinator'
  const activeInstitutionId = ownInstitutionId ?? selectedInstitutionId
  const needsOrgPicker = isGlobalStaff && !ownInstitutionId && !selectedInstitutionId

  useEffect(() => {
    if (!isAuthenticated || !account) { setRegistering(false); return }
    let cancelled = false
    const register = async () => {
      setRegistering(true)
      try {
        await instance.acquireTokenSilent({ ...apiRequest, account })
        const result = await apiPost<{
          id: string; role: string; displayName: string; email: string
          institutionId: string | null; platformRole: PlatformRole
        }>('/api/auth/register', {
          azureAdId:   account.localAccountId,
          email:       account.username,
          displayName: account.name ?? account.username,
          role:        'institution_admin',
        })
        if (cancelled) return
        if (result.error || !result.data) {
          setNotInvited(result.error?.code === 'NOT_INVITED')
          setUser(null)
          setOwnInstitutionId(null)
          setPlatformRole(null)
          return
        }

        const staffTier = result.data.platformRole
        setPlatformRole(staffTier)
        setOwnInstitutionId(result.data.institutionId)

        if (!result.data.institutionId && !(staffTier === 'admin' || staffTier === 'coordinator')) {
          // No institution of their own, and not global staff either —
          // genuinely not set up.
          setNotInvited(true)
          setUser(null)
          return
        }

        setNotInvited(false)
        setUser({
          id: result.data.id, name: result.data.displayName, email: result.data.email,
          institutionId: result.data.institutionId ?? '',
          role: result.data.role === 'institution_tutor' ? 'tutor' : 'admin',
        })

        if (staffTier === 'admin' || staffTier === 'coordinator') {
          const stored = typeof window !== 'undefined' ? window.localStorage.getItem(SELECTED_INSTITUTION_KEY) : null
          if (stored) setSelectedInstitutionId(stored)
          listInstitutions().then(list => { if (!cancelled) setAvailableInstitutions(list) })
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

  // Fetch the actual Institution record whenever the active id changes —
  // covers both the normal (own institution) case and a global-staff pick.
  useEffect(() => {
    if (!activeInstitutionId) { setInstitution(null); return }
    let cancelled = false
    setInstitutionLoading(true)
    getInstitution(activeInstitutionId).then(inst => {
      if (!cancelled) setInstitution(inst)
    }).finally(() => { if (!cancelled) setInstitutionLoading(false) })
    return () => { cancelled = true }
  }, [activeInstitutionId])

  const selectInstitution = useCallback((institutionId: string) => {
    setSelectedInstitutionId(institutionId)
    try { window.localStorage.setItem(SELECTED_INSTITUTION_KEY, institutionId) } catch { /* ignore */ }
  }, [])

  const clearInstitutionSelection = useCallback(() => {
    setSelectedInstitutionId(null)
    try { window.localStorage.removeItem(SELECTED_INSTITUTION_KEY) } catch { /* ignore */ }
  }, [])

  const signIn = () => {
    instance.loginRedirect(loginRequest).catch(console.error)
  }

  const signOut = () => {
    try { window.localStorage.removeItem(SELECTED_INSTITUTION_KEY) } catch { /* ignore */ }
    instance.logoutRedirect({ postLogoutRedirectUri: '/' }).catch(console.error)
  }

  return {
    isAuthenticated, user, institution,
    isLoading: isLoading || registering || institutionLoading,
    notInvited, isGlobalStaff, needsOrgPicker, availableInstitutions,
    selectInstitution, clearInstitutionSelection,
    signIn, signOut,
  }
}
