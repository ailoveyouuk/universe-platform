'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLearnerId }                      from '@/lib/auth/LearnerContext'
import { getCandidateProfile, updateCandidateProfile } from '@/lib/api/learnerApi'
import type { CandidateProfile }             from '@rc/types'

export function useProfile() {
  const learnerId                         = useLearnerId()
  const [profile, setProfile]             = useState<Partial<CandidateProfile>>({})
  const [loading, setLoading]             = useState(true)
  const [error,   setError]               = useState<string | null>(null)

  useEffect(() => {
    if (!learnerId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    getCandidateProfile(learnerId)
      .then(data => { setProfile(data ?? {}) })
      .catch(() => { setError('Failed to load profile') })
      .finally(() => { setLoading(false) })
  }, [learnerId])

  const updateSection = useCallback(async (updates: Partial<CandidateProfile>): Promise<boolean> => {
    if (!learnerId) return false
    const updated = await updateCandidateProfile(learnerId, updates)
    if (updated) setProfile(prev => ({ ...prev, ...updates }))
    return !!updated
  }, [learnerId])

  return { profile, loading, error, updateSection }
}
