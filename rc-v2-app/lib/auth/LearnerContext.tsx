'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/lib/auth/useAuth'
import { registerLearner, type RegisteredInstitutionBrand } from '@/lib/api/learnerApi'
import { brand } from '@rc/theme'

// Applies an institution's own color as --rc-accent-rgb/--rc-accent-600-rgb
// on the document root, which every existing bg-rc-green/text-rc-green/etc.
// class now resolves through — including opacity-modifier classes like
// bg-rc-green/15 (see tailwind.config.ts's withOpacity: it needs the raw
// "R G B" channel numbers, not a full color string, to blend in an alpha
// value at build time). Skipped entirely when the institution is on the
// standard RC green — including the "Individual Learners" placeholder and
// any institution that's never set a color — so nothing changes for the
// vast majority of learners, and no work happens on every page load for
// them.
function applyInstitutionBrand(institution: RegisteredInstitutionBrand | null) {
  const root = document.documentElement
  const color = institution?.primaryColor
  if (!color || color.toLowerCase() === brand.green.toLowerCase()) {
    root.style.removeProperty('--rc-accent-rgb')
    root.style.removeProperty('--rc-accent-600-rgb')
    return
  }
  root.style.setProperty('--rc-accent-rgb', hexToRgb(color))
  root.style.setProperty('--rc-accent-600-rgb', hexToRgb(darken(color, 0.18)))
}

function hexToRgb(hex: string): string {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim())
  if (!match) return hex
  return `${parseInt(match[1], 16)} ${parseInt(match[2], 16)} ${parseInt(match[3], 16)}`
}

// Matches @rc/theme's own greenShades[600], which is roughly an 18%
// per-channel darken of greenShades base — applied here at runtime since
// an institution's primaryColor has no pre-computed hover shade of its own.
function darken(hex: string, amount: number): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return hex
  const num = parseInt(match[1], 16)
  const channel = (shift: number) => Math.max(0, Math.min(255, Math.round(((num >> shift) & 0xff) * (1 - amount))))
  const r = channel(16)
  const g = channel(8)
  const b = channel(0)
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

// Resolves the signed-in Azure AD account to its real Postgres Learner.id.
// Nothing downstream (ProgressContext, useProfile, etc.) should ever use
// useAuth()'s user.id directly for a backend call — that's the MSAL account
// id, not the database row id, and the two are not interchangeable.

interface LearnerContextValue {
  learnerId: string | null
  resolving: boolean
  // Set once resolution has finished and we still don't have a learnerId —
  // e.g. a network/API failure. Consumers (useLearnerAccess) use this to
  // stop treating the situation as "still loading" and show a real error
  // instead of spinning forever.
  error: string | null
  // True only for the registration call that actually created this
  // person's User row for the very first time ever — false on every
  // subsequent sign-in, including later page loads in the same session.
  // Drives the one-time "Hello, welcome to Renewables Connect" greeting
  // vs. the normal "Welcome back" one on the dashboard.
  isNewUser: boolean
}

const LearnerContext = createContext<LearnerContextValue>({ learnerId: null, resolving: false, error: null, isNewUser: false })

export function LearnerProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const [learnerId, setLearnerId] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [isNewUser, setIsNewUser] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setLearnerId(null)
      setError(null)
      applyInstitutionBrand(null)
      return
    }

    let cancelled = false
    setResolving(true)
    setError(null)

    registerLearner({
      azureAdId:   user.id,
      email:       user.email,
      displayName: user.displayName,
      role:        'learner',
    })
      .then(result => {
        if (cancelled) return
        if (!result?.learnerId) {
          console.error('[LearnerContext] registration succeeded without a learnerId — progress will not sync', result)
          setError('We couldn\'t set up your learner profile. Please refresh, or contact support if this keeps happening.')
          return
        }
        setLearnerId(result.learnerId)
        setIsNewUser(result.isNewUser)
        applyInstitutionBrand(result.institution)
      })
      .catch(err => {
        if (cancelled) return
        console.error('[LearnerContext] failed to register/resolve learner', err)
        setError('We couldn\'t reach the server to set up your learner profile. Check your connection and refresh.')
      })
      .finally(() => {
        if (!cancelled) setResolving(false)
      })

    return () => { cancelled = true }
  }, [isAuthenticated, user])

  return (
    <LearnerContext.Provider value={{ learnerId, resolving, error, isNewUser }}>
      {children}
    </LearnerContext.Provider>
  )
}

export function useLearnerId(): string | null {
  return useContext(LearnerContext).learnerId
}

export function useLearnerContext(): LearnerContextValue {
  return useContext(LearnerContext)
}
