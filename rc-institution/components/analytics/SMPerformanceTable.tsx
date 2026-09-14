'use client'
import { useState } from 'react'
import type { SMStat } from '@/lib/data/types'

function colBadge(pct: number | null): string {
  if (pct === null) return 'text-slate-500'
  if (pct >= 80) return 'text-emerald-600'
  if (pct >= 60) return 'text-amber-500'
  return 'text-red-500'
}

type SortKey = 'smId' | 'partNumber' | 'studentsAttempted' | 'studentsCompleted' | 'completionRate' | 'avgCOL'

interface SMPerformanceTableProps {
  smStats: SMStat[]
}

export function SMPerformanceTable({ smStats }: SMPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('smId')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const rows = smStats.map(s => ({
    ...s,
    completionRate: s.studentsAttempted > 0
      ? Math.round((s.studentsCompleted / s.studentsAttempted) * 100)
      : 0,
  }))

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'smId')               cmp = a.smId - b.smId
    else if (sortKey === 'partNumber')    cmp = a.partNumber - b.partNumber
    else if (sortKey === 'studentsAttempted') cmp = a.studentsAttempted - b.studentsAttempted
    else if (sortKey === 'studentsCompleted') cmp = a.studentsCompleted - b.studentsCompleted
    else if (sortKey === 'completionRate') cmp = a.completionRate - b.completionRate
    else if (sortKey === 'avgCOL')        cmp = (a.avgCOLPercent ?? -1) - (b.avgCOLPercent ?? -1)
    return sortDir === 'asc' ? cmp : -cmp
  })

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide py-2 px-5 bg-inst-bg cursor-pointer hover:text-inst-slate transition-colors select-none"
      onClick={() => handleSort(k)}
    >
      {label}{sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  )

  return (
    <div className="card overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <h3 className="font-heading font-semibold text-inst-slate text-sm">SM Performance Breakdown</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-t border-inst-border">
              <Th k="smId" label="SM" />
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide py-2 px-5 bg-inst-bg">
                Title
              </th>
              <Th k="partNumber" label="Part" />
              <Th k="studentsAttempted" label="Attempted" />
              <Th k="studentsCompleted" label="Completed" />
              <Th k="completionRate" label="Completion %" />
              <Th k="avgCOL" label="Avg COL %" />
            </tr>
          </thead>
          <tbody className="divide-y divide-inst-border">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-slate-500">
                  No sub-module data available yet.
                </td>
              </tr>
            ) : sorted.map(row => (
              <tr key={row.smId} className="hover:bg-inst-bg transition-colors">
                <td className="py-3 px-5 text-sm font-semibold text-slate-500">SM{row.smId}</td>
                <td className="py-3 px-5 text-sm text-inst-slate max-w-64 truncate">{row.smTitle}</td>
                <td className="py-3 px-5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    row.partNumber === 1 ? 'bg-emerald-50 text-emerald-700' :
                    row.partNumber === 2 ? 'bg-blue-50 text-blue-600' :
                    'bg-purple-50 text-purple-600'
                  }`}>
                    Part {row.partNumber}
                  </span>
                </td>
                <td className="py-3 px-5 text-sm text-slate-600">{row.studentsAttempted}</td>
                <td className="py-3 px-5 text-sm text-slate-600">{row.studentsCompleted}</td>
                <td className="py-3 px-5">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rc-green rounded-full" style={{ width: `${row.completionRate}%` }} />
                    </div>
                    <span className="text-xs text-slate-600">{row.completionRate}%</span>
                  </div>
                </td>
                <td className="py-3 px-5">
                  {row.avgCOLPercent !== null ? (
                    <span className={`text-sm font-semibold ${colBadge(row.avgCOLPercent)}`}>
                      {Math.round(row.avgCOLPercent)}%
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
