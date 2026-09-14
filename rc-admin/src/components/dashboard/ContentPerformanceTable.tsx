import type { SMPerformanceStat } from '@/lib/data/types'

const PART_COLORS: Record<number, string> = {
  1: 'text-rc-green-dark bg-rc-green/10',
  2: 'text-sky-700 bg-sky-50',
  3: 'text-purple-700 bg-purple-50',
}

function colBadge(pct: number | null): string {
  if (pct === null) return 'text-slate-500 bg-slate-100'
  if (pct >= 80) return 'text-emerald-700 bg-emerald-50'
  if (pct >= 60) return 'text-amber-700 bg-amber-50'
  return 'text-red-700 bg-red-50'
}

interface ContentPerformanceTableProps {
  smStats: SMPerformanceStat[]
}

export function ContentPerformanceTable({ smStats }: ContentPerformanceTableProps) {
  if (smStats.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="font-heading font-semibold text-adm-bg text-sm mb-4">Content Performance</h3>
        <p className="text-sm text-slate-500 text-center py-8">No content performance data yet</p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <h3 className="font-heading font-semibold text-adm-bg text-sm mb-4">Content Performance — All Sub-Modules</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-adm-cborder">
              {['SM', 'Title', 'Part', 'Starts', 'Completions', 'Completion Rate', 'Avg COL', 'Avg Time', 'Drop-off'].map(h => (
                <th key={h} className="text-left font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-adm-cborder">
            {smStats.map(sm => (
              <tr key={sm.smId} className="hover:bg-adm-page transition-colors">
                <td className="py-2.5 pr-4 font-mono font-medium text-adm-bg">SM{sm.smId}</td>
                <td className="py-2.5 pr-4 text-adm-bg max-w-48 truncate">{sm.smTitle}</td>
                <td className="py-2.5 pr-4">
                  <span className={`stat-pill font-semibold ${PART_COLORS[sm.partNumber]}`}>P{sm.partNumber}</span>
                </td>
                <td className="py-2.5 pr-4 text-slate-600">{sm.totalStarts.toLocaleString()}</td>
                <td className="py-2.5 pr-4 text-slate-600">{sm.totalCompletions.toLocaleString()}</td>
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rc-green rounded-full" style={{ width: `${sm.completionRate}%` }} />
                    </div>
                    <span className="text-slate-600">{Math.round(sm.completionRate)}%</span>
                  </div>
                </td>
                <td className="py-2.5 pr-4">
                  <span className={`stat-pill font-semibold ${colBadge(sm.avgCOLPercent)}`}>
                    {sm.avgCOLPercent != null ? `${Math.round(sm.avgCOLPercent)}%` : '—'}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-slate-500">
                  {sm.avgTimeToCompleteHours != null ? `${sm.avgTimeToCompleteHours.toFixed(1)}h` : '—'}
                </td>
                <td className="py-2.5">
                  <span className={sm.dropoffRate > 30 ? 'text-red-600 font-semibold' : 'text-slate-500'}>
                    {Math.round(sm.dropoffRate)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
