'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'
import { clsx } from 'clsx'
import { useAuth } from '@/lib/auth/useAuth'
import { useLearnerAccess } from '@/lib/access/useLearnerAccess'

interface AppLayoutProps {
  children: React.ReactNode
  breadcrumbs?: { label: string; href?: string }[]
  headerActions?: React.ReactNode
}

export function AppLayout({ children, breadcrumbs, headerActions }: AppLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { unlockedParts, loading: accessLoading, error: accessError } = useLearnerAccess()

  // Every page that renders through AppLayout carries a signed-in learner's
  // own data (progress, access, profile) — gate here once rather than
  // repeating this check on every page. Pages outside AppLayout (e.g. the
  // module viewer) carry their own equivalent guard.
  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated, router])

  // A signed-in learner with zero unlocked curriculum parts isn't linked to
  // any institution, cohort or individual purchase — send them to the
  // "not connected" explainer instead of an empty/locked dashboard. Wait
  // for access to actually finish loading (and skip on a real fetch error,
  // which is a different problem) so nobody gets bounced there while their
  // real access is still on its way in.
  useEffect(() => {
    if (!isAuthenticated) return
    if (accessLoading || accessError) return
    if (unlockedParts.length > 0) return
    if (pathname === '/not-connected') return
    router.replace('/not-connected')
  }, [isAuthenticated, accessLoading, accessError, unlockedParts, pathname, router])

  // Lock background scroll while the mobile drawer is open — otherwise iOS
  // Safari lets a touch-drag inside the drawer scroll the page underneath
  // it instead of the drawer's own nav list.
  useEffect(() => {
    if (!mobileMenuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileMenuOpen])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rc-bg-main">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-rc-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-rc-grey">Redirecting to sign in…</p>
        </div>
      </div>
    )
  }

  // While access is still loading, or has loaded with zero unlocked parts
  // (meaning the effect above is about to redirect to /not-connected), don't
  // paint the real dashboard shell and children underneath — that's exactly
  // the "signed in as Unknown, zero real data" flash a zero-access learner
  // would otherwise see for an instant before the redirect lands.
  if (accessLoading || (!accessError && unlockedParts.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rc-bg-main">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-rc-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-rc-grey">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-50 flex md:relative md:flex-shrink-0',
        'transition-transform duration-300',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}>
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="rc-main min-w-0">
        <TopHeader
          breadcrumbs={breadcrumbs}
          actions={headerActions}
          onMobileMenuToggle={() => setMobileMenuOpen(v => !v)}
        />
        <main className="rc-page">
          {children}
        </main>
      </div>
    </div>
  )
}
