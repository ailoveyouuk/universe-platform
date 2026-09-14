'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEmployerAuth } from '@/lib/auth/useEmployerAuth'
import { getCandidates, getShortlist, addToShortlist, getActiveRoles, getProfileStats } from '@/lib/api/employerApi'
import type { CandidateFilters } from '@/lib/api/employerApi'
import { EmployerLayout } from '@/components/layout/EmployerLayout'
import type { CandidateProfile, ShortlistedCandidate, JobRole, CompletionLevel, ProfileStats } from '@/lib/data/types'

const LEVEL_STYLES: Record<CompletionLevel, { label: string; className: string }> = {
  module:  { label: 'Module Complete', className: 'bg-amber-100 text-amber-700' },
  part:    { label: 'Part Complete',   className: 'bg-emerald-100 text-emerald-700' },
  partial: { label: 'In Progress',     className: 'bg-blue-100 text-blue-600' },
  none:    { label: 'Getting Started', className: 'bg-slate-100 text-slate-500' },
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

// Additional (non-curriculum) filters, grouped the same way as the Insights
// page's profile breakdown sections. `statsKey`/`field` point at where each
// filter's dropdown options live in ProfileStats, so the options offered are
// always real values candidates have actually selected -- never a hardcoded
// list that can drift from what rc-v2-app's profile form allows.
type ProfileFilterKey = keyof CandidateFilters
const MORE_FILTERS: { heading: string; fields: { key: ProfileFilterKey; label: string; section: keyof ProfileStats; stat: string }[] }[] = [
  {
    heading: 'Right to work & location',
    fields: [
      { key: 'rightToWorkUK', label: 'Right to work (UK)', section: 'rightToWork', stat: 'rightToWorkUK' },
      { key: 'willingToRelocate', label: 'Willing to relocate', section: 'rightToWork', stat: 'willingToRelocate' },
      { key: 'ukRegion', label: 'UK region', section: 'rightToWork', stat: 'ukRegion' },
    ],
  },
  {
    heading: 'Interests',
    fields: [
      { key: 'primaryTechArea', label: 'Primary tech area', section: 'interests', stat: 'primaryTechArea' },
      { key: 'targetRoleType', label: 'Target role type', section: 'interests', stat: 'targetRoleTypes' },
      { key: 'preferredEmployerType', label: 'Preferred employer type', section: 'interests', stat: 'preferredEmployerTypes' },
    ],
  },
  {
    heading: 'Experience',
    fields: [
      { key: 'experienceLevel', label: 'Experience level', section: 'experience', stat: 'experienceLevel' },
      { key: 'employmentStatus', label: 'Employment status', section: 'experience', stat: 'employmentStatus' },
      { key: 'availability', label: 'Availability', section: 'experience', stat: 'availability' },
    ],
  },
  {
    heading: 'Qualifications',
    fields: [
      { key: 'highestQualification', label: 'Highest qualification', section: 'qualifications', stat: 'highestQualification' },
      { key: 'professionalBody', label: 'Professional body', section: 'qualifications', stat: 'professionalBodies' },
      { key: 'charteredStatus', label: 'Chartered status', section: 'qualifications', stat: 'charteredStatus' },
    ],
  },
  {
    heading: 'Sector specialism',
    fields: [
      { key: 'turbineOEM', label: 'Turbine OEM experience', section: 'sectorSpecialism', stat: 'turbineOEMExp' },
      { key: 'offshoreExpType', label: 'Offshore experience', section: 'sectorSpecialism', stat: 'offshoreExpTypes' },
      { key: 'batteryChemistry', label: 'Battery chemistry', section: 'sectorSpecialism', stat: 'batteryChemistry' },
    ],
  },
  {
    heading: 'Track record & career',
    fields: [
      { key: 'teamLeadershipLevel', label: 'Team leadership level', section: 'trackRecord', stat: 'teamLeadershipLevel' },
      { key: 'careerMotivation', label: 'Career motivation', section: 'careerAspirations', stat: 'careerMotivations' },
    ],
  },
]

function optionsFor(profileStats: ProfileStats | null, section: keyof ProfileStats, stat: string): string[] {
  if (!profileStats) return []
  const group = profileStats[section] as unknown as Record<string, { value: string; count: number }[]>
  return (group?.[stat] ?? []).map(t => t.value)
}

// useSearchParams() requires a Suspense boundary in static-export mode.
export default function CandidatesPage() {
  return (
    <Suspense fallback={null}>
      <CandidatesPageInner />
    </Suspense>
  )
}

function CandidatesPageInner() {
  // Sign-in gating now happens once, centrally, in EmployerLayout (via EmployerAccessGate).
  const { isAuthenticated, employer } = useEmployerAuth()
  const searchParams = useSearchParams()
  const [candidates, setCandidates] = useState<CandidateProfile[]>([])
  const [shortlist, setShortlist] = useState<ShortlistedCandidate[]>([])
  const [roles, setRoles] = useState<JobRole[]>([])
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null)
  const [fetching, setFetching] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [showMoreFilters, setShowMoreFilters] = useState(false)

  const [completionLevel, setCompletionLevel] = useState<CompletionLevel | ''>('')
  const [minCOL, setMinCOL] = useState<string>(() => searchParams.get('minCOL') ?? '')
  const [partCompleted, setPartCompleted] = useState<string>('')
  const [moreFilters, setMoreFilters] = useState<Partial<Record<ProfileFilterKey, string>>>({})

  const activeMoreFilterCount = Object.values(moreFilters).filter(Boolean).length

  async function loadCandidates() {
    if (!employer) return
    setFetching(true)
    const filters: CandidateFilters = {}
    if (completionLevel) filters.completionLevel = completionLevel
    if (minCOL)          filters.minCOL = Number(minCOL)
    if (partCompleted)   filters.partCompleted = Number(partCompleted)
    for (const [key, value] of Object.entries(moreFilters)) {
      if (value) (filters as Record<string, string>)[key] = value
    }
    const data = await getCandidates(employer.id, filters)
    setCandidates(data)
    setFetching(false)
  }

  useEffect(() => {
    if (!isAuthenticated || !employer) return
    loadCandidates()
    getShortlist(employer.id).then(setShortlist)
    getActiveRoles(employer.id).then(setRoles)
    getProfileStats(employer.id).then(setProfileStats)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, employer])

  useEffect(() => {
    if (!isAuthenticated || !employer) return
    loadCandidates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completionLevel, minCOL, partCompleted, moreFilters])

  async function handleShortlist(candidateId: string) {
    if (!employer) return
    setAddingId(candidateId)
    const entry = await addToShortlist(employer.id, candidateId, null, '')
    if (entry) setShortlist(prev => [entry, ...prev])
    setAddingId(null)
  }

  const shortlistedIds = new Set(shortlist.map(s => s.candidateId))
  const anyFilterActive = Boolean(completionLevel || minCOL || partCompleted || activeMoreFilterCount > 0)

  function clearAllFilters() {
    setCompletionLevel('')
    setMinCOL('')
    setPartCompleted('')
    setMoreFilters({})
  }

  return (
    <EmployerLayout
      title="Talent Pool"
      subtitle={`${candidates.length} candidate${candidates.length === 1 ? '' : 's'} available to discovery`}
    >
      {/* Filters */}
      <div className="card p-4 mb-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Completion level</label>
            <select
              value={completionLevel}
              onChange={e => setCompletionLevel(e.target.value as CompletionLevel | '')}
              className="border border-emp-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Any</option>
              <option value="module">Module complete</option>
              <option value="part">Part complete</option>
              <option value="partial">In progress</option>
              <option value="none">Getting started</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Min. avg COL score</label>
            <input
              type="number"
              min={0}
              max={100}
              value={minCOL}
              onChange={e => setMinCOL(e.target.value)}
              placeholder="e.g. 80"
              className="border border-emp-border rounded-lg px-3 py-2 text-sm w-28"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Part completed</label>
            <select
              value={partCompleted}
              onChange={e => setPartCompleted(e.target.value)}
              className="border border-emp-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Any</option>
              <option value="1">Part 1</option>
              <option value="2">Part 2</option>
              <option value="3">Part 3</option>
            </select>
          </div>
          <button
            onClick={() => setShowMoreFilters(v => !v)}
            className="text-xs font-semibold text-emp-accent hover:text-emp-navy transition-colors pb-2"
          >
            {showMoreFilters ? 'Hide profile filters ▲' : `Profile filters ▾${activeMoreFilterCount > 0 ? ` (${activeMoreFilterCount})` : ''}`}
          </button>
          {anyFilterActive && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-slate-500 hover:text-emp-navy transition-colors pb-2"
            >
              Clear filters
            </button>
          )}
        </div>

        {showMoreFilters && (
          <div className="mt-4 pt-4 border-t border-emp-border grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-4">
            {MORE_FILTERS.map(group => (
              <div key={group.heading}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">{group.heading}</p>
                <div className="space-y-2.5">
                  {group.fields.map(f => {
                    const options = optionsFor(profileStats, f.section, f.stat)
                    return (
                      <div key={f.key}>
                        <label className="block text-xs text-slate-500 mb-1">{f.label}</label>
                        <select
                          value={moreFilters[f.key] ?? ''}
                          onChange={e => setMoreFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                          disabled={options.length === 0}
                          className="w-full border border-emp-border rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 disabled:bg-slate-50"
                        >
                          <option value="">Any</option>
                          {options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {fetching && (
        <div className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
          <div className="w-3 h-3 border border-emp-accent border-t-transparent rounded-full animate-spin" />
          Loading candidates...
        </div>
      )}

      {!fetching && candidates.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-3xl mb-3">◉</p>
          <h2 className="font-heading font-bold text-emp-navy text-lg mb-2">No candidates match</h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            No candidates currently meet these filters. Try widening your criteria, or check back as more learners opt in to employer discovery.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {candidates.map(c => {
            const { label, className } = LEVEL_STYLES[c.completionLevel]
            const isShortlisted = shortlistedIds.has(c.id)
            const profileChips = [c.ukRegion, c.experienceLevel, c.highestQualification].filter((v): v is string => Boolean(v))
            return (
              <div key={c.id} className="card p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emp-navy/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-emp-navy text-sm font-bold font-heading">
                        {c.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emp-navy">{c.displayName}</p>
                      <span className={`badge ${className}`}>{label}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                  <span>{c.smsCompleted}/15 SMs</span>
                  {c.avgCOLPercent !== null && <span>· COL {Math.round(c.avgCOLPercent)}%</span>}
                  {c.lastActiveAt && <span>· Active {timeAgo(c.lastActiveAt)}</span>}
                </div>

                {profileChips.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {profileChips.map(chip => (
                      <span key={chip} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{chip}</span>
                    ))}
                  </div>
                )}

                {c.partsCompleted.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {c.partsCompleted.map(p => (
                      <span key={p} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Part {p}</span>
                    ))}
                  </div>
                )}

                {c.topSkillAreas.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {c.topSkillAreas.slice(0, 4).map(skill => (
                      <span key={skill} className="text-xs bg-emp-accent/10 text-emp-accent px-1.5 py-0.5 rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {c.credentialIds.length > 0 && (
                  <p className="text-xs text-slate-500 mb-4">{c.credentialIds.length} credential{c.credentialIds.length === 1 ? '' : 's'} earned</p>
                )}

                <div className="mt-auto pt-3 border-t border-emp-border">
                  <button
                    onClick={() => handleShortlist(c.id)}
                    disabled={isShortlisted || addingId === c.id}
                    className={`w-full text-xs font-semibold py-2 rounded-lg transition-colors ${
                      isShortlisted
                        ? 'bg-emerald-50 text-emerald-600 cursor-default'
                        : 'bg-emp-navy text-white hover:bg-emp-slate disabled:opacity-50'
                    }`}
                  >
                    {isShortlisted ? '✓ Shortlisted' : addingId === c.id ? 'Adding…' : '+ Add to shortlist'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {roles.length === 0 && (
        <p className="text-xs text-slate-500 mt-6">
          Tip: add open roles to see which candidates best match your requirements.
        </p>
      )}
    </EmployerLayout>
  )
}
