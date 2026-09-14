'use client'

import { useAdminAuth } from '@/lib/auth/useAdminAuth'

// RC wordmark used consistently across every gated state on this app —
// matches the mark already used on the dashboard's own sign-in screen.
function RCMark() {
  return (
    <div className="w-12 h-12 rounded-xl bg-rc-green flex items-center justify-center mx-auto mb-4">
      <span className="text-white font-heading font-bold text-lg">RC</span>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center bg-adm-bg p-6">
      <div className="bg-adm-surface border border-adm-border rounded-2xl p-10 max-w-sm w-full text-center">
        {children}
      </div>
    </div>
  )
}

export function AdminAccessGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, notInvited, signIn, signOut } = useAdminAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-adm-bg">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-rc-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-adm-muted">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Shell>
        <RCMark />
        <h1 className="font-heading font-bold text-adm-text text-xl mb-1">Admin Portal</h1>
        <p className="text-sm text-adm-muted mb-6">Renewables Connect · Internal access only</p>
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-2 bg-rc-green text-white text-sm font-semibold py-2.5 px-4 rounded-lg hover:bg-rc-green-dark transition-colors"
        >
          Sign in with Microsoft
        </button>
        <p className="text-xs text-adm-muted mt-3">RC staff credentials required</p>
      </Shell>
    )
  }

  if (notInvited) {
    return (
      <Shell>
        <RCMark />
        <h1 className="font-heading font-bold text-adm-text text-xl mb-2">Access not set up yet</h1>
        <p className="text-sm text-adm-muted mb-6">
          Your Microsoft account signed in successfully, but it isn't linked to an admin role on the Renewables
          Connect platform. Admin access is invite-only — an existing admin needs to add your email to the
          Team page before you can get in.
        </p>
        {/* Light callout nested inside the otherwise-dark Shell — needs the
            light-surface (adm-ink) text tokens, not the dark-surface ones
            used everywhere else in this component. */}
        <div className="text-left bg-adm-page rounded-lg p-4 mb-6">
          <p className="text-xs font-semibold text-adm-ink mb-1">What to do next</p>
          <p className="text-xs text-adm-ink-muted">
            Ask a Renewables Connect admin to invite you, or reach the team directly at{' '}
            <a href="mailto:registrations@renewablesconnect.com" className="text-rc-green-600 font-medium hover:opacity-70 transition-opacity">
              registrations@renewablesconnect.com
            </a>.
          </p>
        </div>
        <a
          href="https://renewablesconnect.com"
          className="w-full flex items-center justify-center gap-2 bg-rc-green text-white text-sm font-semibold py-2.5 px-4 rounded-lg hover:bg-rc-green-dark transition-colors mb-3"
        >
          Visit renewablesconnect.com
        </a>
        <button onClick={signOut} className="text-xs font-semibold text-adm-muted hover:text-adm-text transition-colors">
          Sign out and try a different account
        </button>
      </Shell>
    )
  }

  return <>{children}</>
}
