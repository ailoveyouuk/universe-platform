'use client'

import { useState } from 'react'
import { useInstitutionAuth } from '@/lib/auth/useInstitutionAuth'

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
    <div className="min-h-screen bg-inst-bg flex items-center justify-center p-6">
      <div className="card p-10 max-w-sm w-full text-center">{children}</div>
    </div>
  )
}

export function InstitutionAccessGate({ children }: { children: React.ReactNode }) {
  const {
    isAuthenticated, isLoading, notInvited, signIn, signOut, user,
    needsOrgPicker, availableInstitutions, selectInstitution,
  } = useInstitutionAuth()
  const [search, setSearch] = useState('')

  if (isLoading && isAuthenticated) {
    return (
      <div className="min-h-screen bg-inst-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-rc-green border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Shell>
        <RCMark />
        <h1 className="font-heading font-bold text-inst-slate text-xl mb-1">Organisation Portal</h1>
        <p className="text-sm text-slate-500 mb-6">Renewables Connect · Organisation staff access</p>
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-2 bg-inst-slate text-white font-semibold text-sm py-3 px-4 rounded-lg hover:bg-slate-700 transition-colors"
        >
          Continue with email
        </button>
        <p className="text-xs text-slate-500 mt-3">Organisation staff access required</p>
      </Shell>
    )
  }

  if (needsOrgPicker) {
    const filtered = search.trim()
      ? availableInstitutions.filter(i =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.shortName.toLowerCase().includes(search.toLowerCase()))
      : availableInstitutions

    return (
      <div className="min-h-screen bg-inst-bg flex items-center justify-center p-6">
        <div className="card p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <RCMark />
            <h1 className="font-heading font-bold text-inst-slate text-lg mb-1">Choose an organisation</h1>
            <p className="text-sm text-slate-500">
              You have Global Admin access — pick an organisation to view its dashboard.
            </p>
          </div>
          {availableInstitutions.length > 6 && (
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search organisations…"
              className="w-full mb-3 px-3 py-2 text-sm border border-inst-border rounded-lg focus:outline-none focus:ring-1 focus:ring-rc-green"
            />
          )}
          <div className="max-h-80 overflow-y-auto -mx-2 px-2">
            {filtered.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-6">No organisations found.</p>
            )}
            {filtered.map(inst => (
              <button
                key={inst.id}
                onClick={() => selectInstitution(inst.id)}
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between border border-transparent hover:border-inst-border mb-1"
              >
                <span>
                  <span className="block text-sm font-semibold text-inst-slate">{inst.name}</span>
                  <span className="block text-xs text-slate-500">{inst.shortName}</span>
                </span>
                <span className="text-slate-400">→</span>
              </button>
            ))}
          </div>
          <button
            onClick={signOut}
            className="text-xs font-semibold text-slate-500 hover:text-inst-slate transition-colors mt-4"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  if (notInvited) {
    return (
      <Shell>
        <RCMark />
        <h1 className="font-heading font-bold text-inst-slate text-lg mb-2">Access not set up yet</h1>
        <p className="text-sm text-slate-500 mb-6">
          Your sign-in worked, but this email isn't linked to an organisation on the Renewables Connect platform.
          Organisation access is invite-only — your Renewables Connect contact needs to add your email before you
          can get in.
        </p>
        <div className="text-left bg-slate-50 rounded-lg p-4 mb-6">
          <p className="text-xs font-semibold text-inst-slate mb-1">What to do next</p>
          <p className="text-xs text-slate-500">
            Ask your Renewables Connect contact to invite you, or reach the team directly at{' '}
            <a
              href="mailto:registrations@renewablesconnect.com"
              className="text-rc-green-600 font-medium hover:opacity-70 transition-opacity"
            >
              registrations@renewablesconnect.com
            </a>
            .
          </p>
        </div>
        <a
          href="https://renewablesconnect.com"
          className="w-full flex items-center justify-center gap-2 bg-inst-slate text-white text-sm font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-700 transition-colors mb-3"
        >
          Visit renewablesconnect.com
        </a>
        <button onClick={signOut} className="text-xs font-semibold text-slate-500 hover:text-inst-slate transition-colors">
          Sign out and try a different email
        </button>
      </Shell>
    )
  }

  // Reached only once loading is done and none of the states above fired —
  // should mean we have a real user record. If we don't (silent auth failed
  // for a reason short of the interactive-redirect case in
  // useInstitutionAuth, e.g. a real network blip), never fall through to
  // the dashboard with no user context — offer a clean retry instead.
  if (!user) {
    return (
      <Shell>
        <RCMark />
        <h1 className="font-heading font-bold text-inst-slate text-lg mb-2">Couldn&rsquo;t verify your access</h1>
        <p className="text-sm text-slate-500 mb-6">
          Something went wrong confirming your sign-in. This can happen right after an update — try again below.
        </p>
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-2 bg-inst-slate text-white text-sm font-semibold py-2.5 px-4 rounded-lg hover:bg-slate-700 transition-colors mb-3"
        >
          Try again
        </button>
        <button onClick={signOut} className="text-xs font-semibold text-slate-500 hover:text-inst-slate transition-colors">
          Sign out and start over
        </button>
      </Shell>
    )
  }

  return <>{children}</>
}
