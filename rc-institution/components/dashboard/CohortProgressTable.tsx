'use client'
import { useState } from 'react'
import type { Cohort, Student } from '@/lib/data/types'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return 'Just now'
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function colColor(pct: number) {
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 60) return 'text-amber-500'
  return 'text-red-500'
}

interface CohortProgressTableProps {
  cohorts: Cohort[]
  students: Student[]
}

export function CohortProgressTable({ cohorts, students }: CohortProgressTableProps) {
  const [sortKey, setSortKey] = useState<string>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const rows = cohorts.map(cohort => {
    const cohortStudents = students.filter(s => s.cohortId === cohort.id)
    const avgProgress = cohortStudents.length === 0 ? 0 :
      cohortStudents.reduce((sum, s) => {
        const done = Object.values(s.smProgress).filter(p => p.status === 'completed').length
        return sum + (done / 15) * 100
      }, 0) / cohortStudents.length

    const colScores = cohortStudents.flatMap(s =>
      Object.values(s.smProgress).map(p => p.colScore?.percent).filter((v): v is number => v !== undefined)
    )
    const avgCOL = colScores.length > 0 ? colScores.reduce((a, b) => a + b, 0) / colScores.length : 0

    const lastActive = cohortStudents
      .map(s => s.lastActiveAt)
      .filter(Boolean)
      .sort()
      .at(-1)

    const smCounts: Record<string, number> = {}
    cohortStudents.forEach(s =>
      Object.values(s.smProgress).forEach(p => {
        if (p.status !== 'not_started') smCounts[p.smTitle] = (smCounts[p.smTitle] ?? 0) + 1
      })
    )
    const mostActiveSM = Object.entries(smCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

    return { cohort, students: cohortStudents.length, avgProgress, avgCOL, lastActive, mostActiveSM }
  })

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'name')          cmp = a.cohort.name.localeCompare(b.cohort.name)
    else if (sortKey === 'students') cmp = a.students - b.students
    else if (sortKey === 'progress') cmp = a.avgProgress - b.avgProgress
    else if (sortKey === 'col')      cmp = a.avgCOL - b.avgCOL
    return sortDir === 'asc' ? cmp : -cmp
  })

  const Th = ({ k, label }: { k: string; label: string }) => (
    <th
      className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4 cursor-pointer hover:text-inst-slate transition-colors"
      onClick={() => { setSortKey(k); setSortDir(s => s === 'asc' ? 'desc' : 'asc') }}
    >
      {label} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div className="card p-5">
      <h3 className="font-heading font-semibold text-inst-slate text-sm mb-4">Cohort Progress</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead><tr>
            <Th k="name" label="Cohort" />
            <Th k="students" label="Students" />
            <Th k="progress" label="Avg Progress" />
            <Th k="col" label="Avg COL" />
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4">Most Active SM</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide pb-2">Last Activity</th>
          </tr></thead>
          <tbody className="divide-y divide-inst-border">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                  No cohorts yet — cohorts will appear here once they are created.
                </td>
              </tr>
            ) : sorted.map(row => (
              <tr key={row.cohort.id} className="hover:bg-inst-bg transition-colors">
                <td className="py-3 pr-4 font-medium text-inst-slate text-sm">{row.cohort.name}</td>
                <td className="py-3 pr-4 text-sm text-slate-600">{row.students}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rc-green rounded-full" style={{ width: `${row.avgProgress}%` }} />
                    </div>
                    <span className="text-xs text-slate-600">{Math.round(row.avgProgress)}%</span>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <span className={`text-sm font-semibold ${colColor(row.avgCOL)}`}>{Math.round(row.avgCOL)}%</span>
                </td>
                <td className="py-3 pr-4 text-xs text-slate-500 max-w-36 truncate">{row.mostActiveSM}</td>
                <td className="py-3 text-xs text-slate-500">{row.lastActive ? timeAgo(row.lastActive) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
