'use client'

import { useState } from 'react'
import { useEmployerAuth } from '@/lib/auth/useEmployerAuth'

// RC wordmark used consistently across every gated state on this app —
// matches the mark already used on the dashboard's own sign-in screen
// (inverted: green mark on navy, not navy mark on white).
function RCMark() {
  return (
    <div className="w-12 h-12 rounded-xl bg-emp-navy flex items-center justify-center mx-auto mb-4">
      <span className="text-rc-green font-heading font-bold text-lg">RC</span>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen items-center justify-center bg-emp-bg p-6">
      <div className="card p-10 max-w-sm w-full text-center">{children}</div>
    </div>
  )
}

export function EmployerAccessGate({ children }: { children: React.ReactNode }) {
  const {
    isAuthenticated, isLoading, notInvited, signIn, signOut, user,
    needsOrgPicker, availableEmployers, selectEmployer,
  } = useEmployerAuth()
  const [search, setSearch] = useState('')

  // Only block with spinner when authenticated — don't stall unauthenticated
  // users who just landed on the page while MSAL processes state.
  if (isLoading && isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-emp-bg">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emp-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Shell>
        <RCMark />
        <h1 className="font-heading font-bold text-emp-navy text-xl mb-1">Employer Portal</h1>
        <p className="text-sm text-slate-500 mb-6">Renewables Connect · Talent Discovery</p>
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-2 bg-emp-navy text-white text-sm font-semibold py-2.5 px-4 rounded-lg hover:bg-emp-slate transition-colors"
        >
          Continue with email
        </button>
        <p className="text-xs text-slate-500 mt-3">Employer/recruiter access required</p>
      </Shell>
    )
  }

  if (needsOrgPicker) {
    const filtered = search.trim()
      ? availableEmployers.filter(e =>
          e.name.toLowerCase().includes(search.toLowerCase()) ||
          e.sector.toLowerCase().includes(search.toLowerCase()))
      : availableEmployers

    return (
      <Shell>
        <RCMark />
        <h1 className="font-heading font-bold text-emp-navy text-lg mb-1">Choose an employer</h1>
        <p className="text-sm text-slate-500 mb-6">
          You have Global Admin access — pick an employer to view its dashboard.
        </p>
        {availableEmployers.length > 6 && (
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employers…"
            className="w-full mb-3 px-3 py-2 text-sm border border-emp-border rounded-lg focus:outline-none focus:ring-1 focus:ring-emp-accent"
          />
        )}
        <div className="max-h-80 overflow-y-auto -mx-2 px-2 text-left">
          {filtered.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">No employers found.</p>
          )}
          {filtered.map(emp => (
            <button
              key={emp.id}
              onClick={() => selectEmployer(emp.id)}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between border border-transparent hover:border-emp-border mb-1"
            >
              <span>
                <span className="block text-sm font-semibold text-emp-navy">{emp.name}</span>
                <span className="block text-xs text-slate-500">{emp.sector}</span>
              </span>
              <span className="text-slate-400">→</span>
            </button>
          ))}
        </div>
        <button
          onClick={signOut}
          className="text-xs font-semibold text-slate-500 hover:text-emp-navy transition-colors mt-4"
        >
          Sign out
        </button>
      </Shell>
    )
  }

  if (notInvited) {
    return (
      <Shell>
        <RCMark />
        <h1 className="font-heading font-bold text-emp-navy text-lg mb-2">Access not set up yet</h1>
        <p className="text-sm text-slate-500 mb-6">
          Your sign-in worked, but this email isn't linked to an employer account on the Renewables Connect
          platform. Employer access is invite-only — your Renewables Connect contact needs to add your email
          before you can get in.
        </p>
        <div className="text-left bg-slate-50 rounded-lg p-4 mb-6">
          <p className="text-xs font-semibold text-emp-navy mb-1">What to do next</p>
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
          className="w-full flex items-center justify-center gap-2 bg-emp-navy text-white text-sm font-semibold py-2.5 px-4 rounded-lg hover:bg-emp-slate transition-colors mb-3"
        >
          Visit renewablesconnect.com
        </a>
        <button onClick={signOut} className="text-xs font-semibold text-slate-500 hover:text-emp-navy transition-colors">
          Sign out and try a different email
        </button>
      </Shell>
    )
  }

  // Reached only once loading is done and none of the states above fired —
  // should mean we have a real user record. If we don't (silent auth failed
  // for a reason short of the interactive-redirect case in useEmployerAuth,
  // e.g. a real network blip), never fall through to the dashboard with no
  // user context — offer a clean retry instead.
  if (!user) {
    return (
      <Shell>
        <RCMark />
        <h1 className="font-heading font-bold text-emp-navy text-lg mb-2">Couldn&rsquo;t verify your access</h1>
        <p className="text-sm text-slate-500 mb-6">
          Something went wrong confirming your sign-in. This can happen right after an update — try again below.
        </p>
        <button
          onClick={signIn}
          className="w-full flex items-center justify-center gap-2 bg-emp-navy text-white text-sm font-semibold py-2.5 px-4 rounded-lg hover:bg-emp-slate transition-colors mb-3"
        >
          Try again
        </button>
        <button onClick={signOut} className="text-xs font-semibold text-slate-500 hover:text-emp-navy transition-colors">
          Sign out and start over
        </button>
      </Shell>
    )
  }

  return <>{children}</>
}
