'use client'
import { useEffect, useState } from 'react'
import { useEmployerAuth } from '@/lib/auth/useEmployerAuth'
import { getShortlist, updateShortlistStage, getAllRoles } from '@/lib/api/employerApi'
import { EmployerLayout } from '@/components/layout/EmployerLayout'
import type { ShortlistedCandidate, JobRole } from '@/lib/data/types'

const STAGES: ShortlistedCandidate['stage'][] = ['interested', 'contacted', 'interviewing', 'offered', 'hired']

const STAGE_LABELS: Record<ShortlistedCandidate['stage'], string> = {
  interested:   'Interested',
  contacted:    'Contacted',
  interviewing: 'Interviewing',
  offered:      'Offered',
  hired:        'Hired',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return 'Just now'
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30)  return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function ShortlistPage() {
  // Sign-in gating now happens once, centrally, in EmployerLayout (via EmployerAccessGate).
  const { isAuthenticated, employer } = useEmployerAuth()
  const [shortlist, setShortlist] = useState<ShortlistedCandidate[]>([])
  const [roles, setRoles] = useState<JobRole[]>([])
  const [fetching, setFetching] = useState(false)
  const [movingId, setMovingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !employer) return
    setFetching(true)
    Promise.all([getShortlist(employer.id), getAllRoles(employer.id)])
      .then(([sl, r]) => { setShortlist(sl); setRoles(r) })
      .finally(() => setFetching(false))
  }, [isAuthenticated, employer])

  async function moveStage(candidateId: string, stage: ShortlistedCandidate['stage']) {
    if (!employer) return
    setMovingId(candidateId)
    await updateShortlistStage(employer.id, candidateId, stage)
    setShortlist(prev => prev.map(s => (s.candidateId === candidateId ? { ...s, stage } : s)))
    setMovingId(null)
  }

  const roleTitle = (roleId: string | null) => roles.find(r => r.id === roleId)?.title ?? null

  return (
    <EmployerLayout title="Shortlist" subtitle="Your saved candidates and pipeline stages">
      {fetching && (
        <div className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
          <div className="w-3 h-3 border border-emp-accent border-t-transparent rounded-full animate-spin" />
          Loading shortlist...
        </div>
      )}

      {!fetching && shortlist.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-3">★</p>
          <h2 className="font-heading font-bold text-emp-navy text-lg mb-2">Nothing shortlisted yet</h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-4">
            Add candidates to your shortlist from the Talent Pool to start moving them through your pipeline.
          </p>
          <a href="/candidates" className="inline-block px-4 py-2 text-xs font-semibold rounded-lg bg-emp-navy text-white hover:bg-emp-slate transition-colors">
            Browse Talent Pool →
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {STAGES.map(stage => {
            const inStage = shortlist.filter(s => s.stage === stage)
            return (
              <div key={stage} className="min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-emp-navy uppercase tracking-wider">{STAGE_LABELS[stage]}</h3>
                  <span className="text-xs text-slate-500">{inStage.length}</span>
                </div>
                <div className="space-y-2">
                  {inStage.map(entry => {
                    const nextIdx = STAGES.indexOf(entry.stage) + 1
                    const nextStage = nextIdx < STAGES.length ? STAGES[nextIdx] : null
                    return (
                      <div key={entry.candidateId} className="card p-3">
                        <p className="text-xs font-semibold text-emp-navy mb-1">Candidate {entry.candidateId.slice(-4).toUpperCase()}</p>
                        {roleTitle(entry.roleId) && (
                          <p className="text-xs text-slate-500 mb-1">for {roleTitle(entry.roleId)}</p>
                        )}
                        {entry.notes && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{entry.notes}</p>}
                        <p className="text-xs text-slate-500 mb-2">Added {timeAgo(entry.addedAt)}</p>
                        {nextStage && (
                          <button
                            disabled={movingId === entry.candidateId}
                            onClick={() => moveStage(entry.candidateId, nextStage)}
                            className="w-full text-xs font-semibold py-1.5 rounded-lg bg-emp-navy/10 text-emp-navy hover:bg-emp-navy hover:text-white transition-colors disabled:opacity-50"
                          >
                            {movingId === entry.candidateId ? 'Moving…' : `Move to ${STAGE_LABELS[nextStage]} →`}
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {inStage.length === 0 && <p className="text-xs text-slate-300 italic">Empty</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </EmployerLayout>
  )
}
