'use client'
import React, { useState } from 'react'
import type { Student, Cohort } from '@/lib/data/types'

function timeAgo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return 'Just now'
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function colColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 60) return 'text-amber-500'
  return 'text-red-500'
}

function calcCompletion(student: Student): number {
  const values = Object.values(student.smProgress)
  if (values.length === 0) return 0
  return Math.round((values.filter(p => p.status === 'completed').length / 15) * 100)
}

function calcAvgCOL(student: Student): number | null {
  const scores = Object.values(student.smProgress)
    .map(p => p.colScore?.percent)
    .filter((v): v is number => v !== undefined)
  if (scores.length === 0) return null
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

const STATUS_BADGE = {
  not_started: 'bg-slate-100 text-slate-500',
  in_progress:  'bg-amber-50 text-amber-600 border border-amber-200',
  completed:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
} as const

const STATUS_ICON = {
  not_started: '·',
  in_progress:  '▶',
  completed:    '✓',
} as const

// Access badges: a full "Full course" pill when all three parts are
// unlocked, otherwise one small pill per unlocked part, or a muted "No
// access" pill when the student has no live grant at all — this is the
// same unlockedParts union rc-v2-app itself gates content on, so what a
// sponsor sees here matches exactly what the student can actually study.
function AccessBadges({ unlockedParts }: { unlockedParts: number[] }) {
  if (unlockedParts.length === 0) {
    return <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">No access</span>
  }
  if (unlockedParts.length === 3) {
    return <span className="text-xs px-1.5 py-0.5 rounded bg-rc-green/10 text-rc-green-700 font-medium">Full course</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {unlockedParts.map(p => (
        <span key={p} className="text-xs px-1.5 py-0.5 rounded bg-inst-slate/10 text-inst-slate">Part {p}</span>
      ))}
    </div>
  )
}

interface StudentRosterProps {
  students: Student[]
  cohorts: Cohort[]
  loading: boolean
}

export function StudentRoster({ students, cohorts, loading }: StudentRosterProps) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const cohortMap = Object.fromEntries(cohorts.map(c => [c.id, c.name]))

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading && students.length === 0) {
    return (
      <div className="card p-5">
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="card p-4 flex items-center gap-3">
        <span className="text-slate-500">◎</span>
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm text-inst-slate placeholder:text-slate-500 outline-none"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-slate-500 hover:text-inst-slate transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h3 className="font-heading font-semibold text-inst-slate text-sm">
            {filtered.length} student{filtered.length !== 1 ? 's' : ''}
            {search ? ` matching "${search}"` : ''}
          </h3>
          <span className="text-xs text-slate-500">Click a row to expand</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-inst-border">
                {['Name', 'Email', 'Cohort', 'Access', 'Last Active', 'Completion', 'Avg COL'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide py-2 px-5 bg-inst-bg">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-inst-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-slate-500">
                    {students.length === 0 ? 'No students enrolled yet.' : 'No students match your search.'}
                  </td>
                </tr>
              ) : filtered.map(student => {
                const completion = calcCompletion(student)
                const avgCOL = calcAvgCOL(student)
                const isExpanded = expandedId === student.id
                const smList = Object.values(student.smProgress).sort((a, b) => a.smId - b.smId)

                return (
                  <React.Fragment key={student.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : student.id)}
                      className="hover:bg-inst-bg transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-inst-slate/10 flex items-center justify-center text-xs font-semibold text-inst-slate flex-shrink-0">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-sm text-inst-slate">{student.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-sm text-slate-500">{student.email}</td>
                      <td className="py-3 px-5 text-sm text-slate-600">{cohortMap[student.cohortId] ?? '—'}</td>
                      <td className="py-3 px-5"><AccessBadges unlockedParts={student.unlockedParts} /></td>
                      <td className="py-3 px-5 text-xs text-slate-500">{timeAgo(student.lastActiveAt)}</td>
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-rc-green rounded-full" style={{ width: `${completion}%` }} />
                          </div>
                          <span className="text-xs text-slate-600">{completion}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        {avgCOL !== null
                          ? <span className={`text-sm font-semibold ${colColor(avgCOL)}`}>{avgCOL}%</span>
                          : <span className="text-xs text-slate-300">—</span>
                        }
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-inst-bg">
                        <td colSpan={7} className="px-5 py-4 border-b border-inst-border">
                          <div className="space-y-4">
                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-slate-500">
                              <span>Enrolled: <span className="text-inst-slate font-medium">{formatDate(student.enrolledAt)}</span></span>
                              <span>Last active: <span className="text-inst-slate font-medium">{formatDate(student.lastActiveAt)}</span></span>
                              <span>Cohort: <span className="text-inst-slate font-medium">{cohortMap[student.cohortId] ?? '—'}</span></span>
                              <span className="flex items-center gap-1.5">Access: <AccessBadges unlockedParts={student.unlockedParts} /></span>
                            </div>

                            {/* SM progress grid */}
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Sub-module progress</p>
                              {smList.length === 0 ? (
                                <p className="text-xs text-slate-500">No sub-module data yet.</p>
                              ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-5 xl:grid-cols-8 gap-2">
                                  {smList.map(sm => (
                                    <div key={sm.smId} className="rounded-lg border border-inst-border bg-white p-2.5">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-[11px] font-bold text-slate-500">SM{sm.smId}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_BADGE[sm.status]}`}>
                                          {STATUS_ICON[sm.status]}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-600 leading-tight truncate" title={sm.smTitle}>
                                        {sm.smTitle}
                                      </p>
                                      {sm.colScore ? (
                                        <p className={`text-[11px] font-semibold mt-1.5 ${colColor(sm.colScore.percent)}`}>
                                          {sm.colScore.score}/{sm.colScore.maxScore} · {Math.round(sm.colScore.percent)}%
                                        </p>
                                      ) : (
                                        <p className="text-[11px] text-slate-300 mt-1.5">No COL</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
