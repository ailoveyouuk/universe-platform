'use client'

import { useEffect, useState } from 'react'
import { useLearnerContext } from '@/lib/auth/LearnerContext'
import { getLearnerAccess, type LearnerAccess } from '@/lib/api/learnerApi'
import type { PartNumber } from '@/lib/curriculum'

// Fetches which curriculum parts the signed-in learner can currently study.
// `loading` stays true until we have a real answer — treat a part as locked
// while loading, never as unlocked, so nothing flashes open before we
// actually know the learner has paid for it. If learner resolution itself
// fails (see LearnerContext), we stop "loading" and surface that failure
// via `error` instead of spinning forever waiting for a learnerId that will
// never arrive.
export function useLearnerAccess(): { unlockedParts: PartNumber[]; loading: boolean; error: string | null } {
  const { learnerId, resolving: learnerResolving, error: learnerError } = useLearnerContext()
  const [access, setAccess]   = useState<LearnerAccess>({ parts: [], grants: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (learnerResolving) return
    if (!learnerId) {
      // Learner resolution finished without an id — either still waiting on
      // sign-in, or it failed (learnerError will be set in that case).
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getLearnerAccess(learnerId)
      .then(result => { if (!cancelled) setAccess(result) })
      .catch(() => { if (!cancelled) setError('Could not load your access — check your connection and refresh.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [learnerId, learnerResolving])

  return {
    unlockedParts: access.parts as PartNumber[],
    loading: learnerResolving || loading,
    error: learnerError ?? error,
  }
}
