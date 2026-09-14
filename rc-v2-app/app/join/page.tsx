'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/useAuth'
import { useLearnerId } from '@/lib/auth/LearnerContext'
import { getInviteInfo, redeemInvite } from '@/lib/api/learnerApi'
import type { InviteInfo } from '@/lib/api/learnerApi'

const PART_LABELS: Record<number, string> = { 1: 'Part 1', 2: 'Part 2', 3: 'Part 3' }

function partsLabel(parts: number[]): string {
  if (parts.length === 3) return 'the full course'
  return parts.map(p => PART_LABELS[p] ?? p).join(' and ')
}

function JoinContent() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code') ?? ''
  const router = useRouter()
  const { isAuthenticated, signIn } = useAuth()
  const learnerId = useLearnerId()

  const [invite, setInvite]       = useState<InviteInfo | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(true)

  const [redeeming, setRedeeming]     = useState(false)
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const hasAttemptedRedeem = useRef(false)

  // Show who this invite is for before the student signs in at all.
  useEffect(() => {
    if (!code) { setLoadingInvite(false); return }
    getInviteInfo(code).then(({ data, error }) => {
      setInvite(data)
      setInviteError(error)
      setLoadingInvite(false)
    })
  }, [code])

  // Once signed in AND the learner record is resolved, redeem automatically
  // — no separate "now type the code in" step. Guarded so it only ever
  // fires once even if this effect re-runs.
  useEffect(() => {
    if (!code || !isAuthenticated || !learnerId || hasAttemptedRedeem.current) return
    hasAttemptedRedeem.current = true
    setRedeeming(true)
    redeemInvite(code).then(({ data, error }) => {
      setRedeeming(false)
      if (error || !data) {
        setRedeemError(error ?? 'Something went wrong redeeming this invite.')
        return
      }
      router.push('/dashboard')
    })
  }, [code, isAuthenticated, learnerId, router])

  if (!code) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center px-4">
        <p className="text-slate-500 text-sm">This link is missing an invite code. Ask your institution for the link again.</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <div className="card p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-rc-green/10 flex items-center justify-center mx-auto mb-4 text-2xl">
          🔗
        </div>

        {loadingInvite ? (
          <p className="text-sm text-slate-400">Checking your invite…</p>
        ) : !invite ? (
          <>
            <h1 className="font-heading font-bold text-lg mb-2">Invite not valid</h1>
            <p className="text-sm text-slate-500">{inviteError ?? 'This link may have expired or been mistyped. Ask your institution for a fresh one.'}</p>
          </>
        ) : invite.full ? (
          <>
            <h1 className="font-heading font-bold text-lg mb-2">This programme is full</h1>
            <p className="text-sm text-slate-500">
              {invite.institutionName}&apos;s &ldquo;{invite.cohortName}&rdquo; has reached its seat limit. Contact {invite.institutionName} for another invite.
            </p>
          </>
        ) : redeemError ? (
          <>
            <h1 className="font-heading font-bold text-lg mb-2">Couldn&apos;t join</h1>
            <p className="text-sm text-slate-500 mb-4">{redeemError}</p>
            <a href="/dashboard" className="text-sm font-semibold text-rc-green-600 hover:opacity-70 transition-opacity">Go to your dashboard →</a>
          </>
        ) : redeeming ? (
          <>
            <div className="w-6 h-6 border-2 border-rc-green border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-500">Setting up your access…</p>
          </>
        ) : (
          <>
            <h1 className="font-heading font-bold text-lg mb-2">Join {invite.institutionName}</h1>
            <p className="text-sm text-slate-500 mb-1">
              &ldquo;{invite.cohortName}&rdquo; gives you {partsLabel(invite.parts)}, for {invite.accessDurationDays} days from today.
            </p>
            {invite.seatsRemaining != null && (
              <p className="text-xs text-slate-400 mb-6">{invite.seatsRemaining} seats remaining</p>
            )}
            {!invite.seatsRemaining && <div className="mb-6" />}

            {isAuthenticated ? (
              <p className="text-sm text-slate-400">Setting up your account…</p>
            ) : (
              <button
                onClick={signIn}
                className="w-full flex items-center justify-center gap-2 bg-rc-green text-white text-sm font-semibold py-2.5 px-4 rounded-lg hover:opacity-90 transition-opacity"
              >
                Sign in with Microsoft to join
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto mt-20 text-center px-4 text-sm text-slate-400">Loading…</div>}>
      <JoinContent />
    </Suspense>
  )
}
