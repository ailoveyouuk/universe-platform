'use client'
import { useState } from 'react'
import type { Cohort, Student } from '@/lib/data/types'
import { CohortCOLChart } from './CohortCOLChart'

function formatDate(iso: string): string {
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

interface CohortListProps {
  cohorts: Cohort[]
  students: Student[]
  loading: boolean
}

export function CohortList({ cohorts, students, loading }: CohortListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (loading && cohorts.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-5 bg-slate-100 rounded w-1/3 mb-3" />
            <div className="h-3 bg-slate-100 rounded w-1/4 mb-4" />
            <div className="h-4 bg-slate-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (cohorts.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-2xl mb-3">⊞</p>
        <h3 className="font-heading font-semibold text-inst-slate text-base mb-1">No cohorts yet</h3>
        <p className="text-sm text-slate-500">Cohorts will appear here once they are created.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {cohorts.map(cohort => {
        const cohortStudents = students.filter(s => cohort.studentIds.includes(s.id))

        const avgCompletion = cohortStudents.length === 0 ? 0 :
          cohortStudents.reduce((sum, s) => sum + calcCompletion(s), 0) / cohortStudents.length

        const colScores = cohortStudents.map(s => calcAvgCOL(s)).filter((v): v is number => v !== null)
        const avgCOL = colScores.length > 0
          ? Math.round(colScores.reduce((a, b) => a + b, 0) / colScores.length)
          : null

        const isExpanded = expandedId === cohort.id

        return (
          <div key={cohort.id} className="card overflow-hidden">
            {/* Card header — click to expand */}
            <div
              onClick={() => setExpandedId(isExpanded ? null : cohort.id)}
              className="p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 cursor-pointer hover:bg-inst-bg transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-bold text-inst-slate text-base mb-0.5">{cohort.name}</h3>
                <p className="text-xs text-slate-500">Started {formatDate(cohort.startDate)}</p>
              </div>
              <div className="flex items-center gap-4 sm:gap-6 flex-wrap sm:flex-nowrap flex-shrink-0 sm:ml-6">
                <div className="text-right">
                  <p className="text-xs text-slate-500 mb-0.5">Students</p>
                  <p className="font-heading font-bold text-inst-slate text-xl">{cohortStudents.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 mb-0.5">Avg Completion</p>
                  <p className="font-heading font-bold text-inst-slate text-xl">{Math.round(avgCompletion)}%</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 mb-0.5">Avg COL</p>
                  <p className={`font-heading font-bold text-xl ${avgCOL !== null ? colColor(avgCOL) : 'text-slate-300'}`}>
                    {avgCOL !== null ? `${avgCOL}%` : '—'}
                  </p>
                </div>
                <span className="text-slate-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* Expanded detail panel */}
            {isExpanded && (
              <div className="border-t border-inst-border p-5 bg-inst-bg">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Student list */}
                  <div>
                    <h4 className="font-heading font-semibold text-inst-slate text-sm mb-3">
                      Students ({cohortStudents.length})
                    </h4>
                    {cohortStudents.length === 0 ? (
                      <p className="text-sm text-slate-500">No students in this cohort.</p>
                    ) : (
                      <div className="space-y-1 overflow-y-auto max-h-56">
                        {cohortStudents.map(s => {
                          const comp = calcCompletion(s)
                          const avgCOLStudent = calcAvgCOL(s)
                          return (
                            <div key={s.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-inst-border">
                              <div className="w-6 h-6 rounded-full bg-inst-slate/10 flex items-center justify-center text-[11px] font-semibold text-inst-slate flex-shrink-0">
                                {s.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-inst-slate truncate">{s.name}</p>
                              </div>
                              <div className="flex items-center gap-3 text-xs flex-shrink-0">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-rc-green rounded-full" style={{ width: `${comp}%` }} />
                                  </div>
                                  <span className="text-slate-500 w-7">{comp}%</span>
                                </div>
                                {avgCOLStudent !== null
                                  ? <span className={`font-semibold w-9 text-right ${colColor(avgCOLStudent)}`}>{avgCOLStudent}%</span>
                                  : <span className="text-slate-300 w-9 text-right">—</span>
                                }
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* COL chart */}
                  <div>
                    <h4 className="font-heading font-semibold text-inst-slate text-sm mb-3">
                      Avg COL Score by Sub-Module
                    </h4>
                    <CohortCOLChart students={cohortStudents} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
