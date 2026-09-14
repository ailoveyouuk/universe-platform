'use client'

import Image from 'next/image'
import { useAuth } from '@/lib/auth/useAuth'

// Shown to a signed-in learner whose account isn't linked to any
// institution, cohort or individual purchase — i.e. they authenticated
// fine but have zero unlocked curriculum parts. Reached via the redirect
// in AppLayout, which sends anyone in that state here instead of the
// dashboard, rather than letting them land on an empty/locked experience
// with no explanation.
export default function NotConnectedPage() {
  const { user, signOut } = useAuth()

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-rc-dark">
      {/* Background photo + dark gradient, matching the CIAM sign-in page */}
      <div className="absolute inset-0">
        <Image src="/entra-signin-bg.jpg" alt="" fill priority className="object-cover" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(100deg, rgba(9,14,26,0.94) 0%, rgba(9,14,26,0.86) 30%, rgba(9,14,26,0.45) 56%, rgba(9,14,26,0.18) 74%, rgba(9,14,26,0.32) 100%)',
          }}
        />
      </div>

      {/* Top bar — logo on a white chip (the mark's dark colourway needs a
          light ground to stay legible over the photo), site link opposite.
          Stacks centred on narrow/mobile screens. */}
      <div className="relative z-10 flex flex-col items-center gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-7">
        <div className="flex items-center rounded-[10px] bg-white/95 px-3.5 py-1.5 shadow-[0_2px_14px_rgba(0,0,0,0.18)]">
          <img src="/images/logos/rc-logo-transparent.png" alt="Renewables Connect" className="h-6 w-auto sm:h-[26px]" />
        </div>
        <a
          href="https://www.renewablesconnect.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white/75 transition-colors hover:border-white/55 hover:bg-white/[0.06] hover:text-white sm:px-3.5 sm:text-[13.5px]"
        >
          renewablesconnect.com
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3 w-3">
            <path d="M7 17L17 7M9 7h8v8" />
          </svg>
        </a>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1180px] flex-1 flex-col items-center gap-10 px-6 py-10 md:grid md:grid-cols-[1.1fr_1fr] md:items-center md:px-10">
        {/* Lede */}
        <div className="text-center md:pr-4 md:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-rc-green/40 bg-rc-green/10 px-3.5 py-1.5 text-xs font-semibold text-rc-green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4l2.5 2.5" />
            </svg>
            Access not yet set up
          </span>
          <h1 className="mt-5 font-heading text-[28px] font-bold leading-tight text-white sm:text-[34px] md:text-[38px]">
            We can&rsquo;t find your Renewables&nbsp;Connect access yet.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/70 md:mx-0">
            Your sign-in worked, but your account isn&rsquo;t linked to a training programme yet. That link is what puts your modules, cohort and progress in place — here&rsquo;s how to sort it.
          </p>
          <p className="mx-auto mt-5 max-w-md border-l-2 border-rc-green/50 pl-4 text-left text-sm leading-relaxed text-white/55 md:mx-0">
            Most learners get access through the institution, training provider or employer who enrolled them — it&rsquo;s usually just a quick check with whoever manages your programme.
          </p>
        </div>

        {/* Card */}
        <div className="mx-auto w-full max-w-md rounded-3xl bg-white px-7 pb-7 pt-8 shadow-2xl sm:px-9 sm:pb-8">
          <img src="/rc-mark-master.png" alt="Renewables Connect" className="h-10 w-10 rounded-full" />
          <h2 className="mt-5 font-heading text-xl font-bold text-rc-dark">Let&rsquo;s get you connected</h2>
          <p className="mt-1.5 text-sm text-rc-grey">Choose whichever matches you — it only takes a moment either way.</p>

          <div className="mt-6 flex gap-3.5 rounded-2xl border border-rc-border bg-rc-bg-main p-4">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-rc-green/10 text-rc-green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
                <path d="M3 21h18M6 21V9l6-4 6 4v12M10 21v-6h4v6" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-rc-dark">Enrolled through an institution or organisation</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-rc-grey">
                Ask them to add you, or confirm the email you signed in with. Once you&rsquo;re added, just sign in again.
              </p>
              <a
                href="mailto:registrations@renewablesconnect.com?subject=Access%20request"
                className="mt-2.5 inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-semibold text-rc-green hover:text-rc-green-600"
              >
                Email registrations →
              </a>
            </div>
          </div>

          <div className="mt-3 flex gap-3.5 rounded-2xl border border-rc-border bg-rc-bg-main p-4">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-rc-green/10 text-rc-green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5">
                <path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-rc-dark">New to Renewables Connect</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-rc-grey">
                Find out about our programmes and how to sign up as an individual, institution or employer.
              </p>
              <a
                href="https://www.renewablesconnect.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-semibold text-rc-green hover:text-rc-green-600"
              >
                Visit our website →
              </a>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-1.5 border-t border-rc-border pt-4 text-[12.5px] text-rc-grey-light">
            <div>
              Registration enquiries:{' '}
              <a href="mailto:registrations@renewablesconnect.com" className="font-medium text-rc-grey hover:text-rc-green">
                registrations@renewablesconnect.com
              </a>
            </div>
            <div>
              Support:{' '}
              <a href="mailto:support@renewablesconnect.com" className="font-medium text-rc-grey hover:text-rc-green">
                support@renewablesconnect.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative z-10 flex flex-col items-center gap-3 px-6 pb-6 text-center text-xs text-white/45 sm:flex-row sm:justify-between sm:px-10 sm:text-left">
        <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-4">
          <span>&copy; {new Date().getFullYear()} Renewables Connect. All rights reserved.</span>
          {user?.email && (
            <span>
              Signed in as {user.email} ·{' '}
              <button type="button" onClick={signOut} className="underline decoration-white/30 underline-offset-2 hover:text-white/80">
                Sign out
              </button>
            </span>
          )}
        </div>
        <a
          href="https://www.linkedin.com/company/renewables-connect-international/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Renewables Connect on LinkedIn"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/60 transition-colors hover:border-rc-green hover:bg-rc-green/15 hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45z" />
        </svg>
      </a>
    </div>
    </div>
  )
}
