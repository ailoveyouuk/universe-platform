'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/useAuth'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const { isAuthenticated, signIn } = useAuth()
  const router = useRouter()

  // If already signed in, go to dashboard
  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard')
  }, [isAuthenticated, router])

  return (
    <div className="min-h-screen bg-rc-dark flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 rounded-xl bg-rc-green flex items-center justify-center">
            <span className="text-white font-bold font-heading text-lg">RC</span>
          </div>
          <span className="font-heading font-bold text-white text-xl">Renewables Connect</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-card-hover p-8">
          <h1 className="font-heading font-bold text-2xl text-rc-dark mb-2">Welcome back</h1>
          <p className="text-rc-grey text-sm mb-8 leading-relaxed">
            Sign in to continue your journey into the world of clean energy.
          </p>

          {/* Sign in / sign up — Entra External ID handles both with an
              email + one-time code, so this isn't a "Microsoft account"
              login and shouldn't be labelled or iconed as one. */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={signIn}
            className="mb-4"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16v16H4z" opacity="0" />
              <path d="M4 6.5 12 13l8-6.5" />
              <rect x="4" y="5" width="16" height="14" rx="2" />
            </svg>
            Continue with email
          </Button>

          <p className="text-xs text-rc-grey-light text-center leading-relaxed mt-6">
            New to Renewables Connect? You can create an account with any email address on the next screen.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/30 mt-8">
          © {new Date().getFullYear()} Renewables Connect. All rights reserved.
        </p>
      </div>
    </div>
  )
}
