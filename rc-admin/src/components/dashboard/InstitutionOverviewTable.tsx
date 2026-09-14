import type { InstitutionSummary } from '@/lib/data/types'
import { clsx } from 'clsx'

const STATUS_STYLES: Record<InstitutionSummary['status'], string> = {
  active:      'bg-emerald-50 text-emerald-700',
  onboarding:  'bg-amber-50 text-amber-700',
  inactive:    'bg-slate-100 text-slate-500',
}

function colColor(pct: number | null): string {
  if (pct === null) return 'text-slate-500'
  if (pct >= 80) return 'text-emerald-600 font-semibold'
  if (pct >= 60) return 'text-amber-600 font-semibold'
  return 'text-red-600 font-semibold'
}

interface InstitutionOverviewTableProps {
  institutions: InstitutionSummary[]
}

export function InstitutionOverviewTable({ institutions }: InstitutionOverviewTableProps) {
  if (institutions.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="font-heading font-semibold text-adm-bg text-sm mb-4">Institutions</h3>
        <p className="text-sm text-slate-500 text-center py-8">No institutions onboarded yet</p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-adm-bg text-sm">Institutions</h3>
        <span className="text-xs text-slate-500">{institutions.length} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-adm-cborder">
              {['Institution', 'Students', 'Active 30d', 'Avg Progress', 'Avg COL', 'Status'].map(h => (
                <th key={h} className="text-left font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-adm-cborder">
            {institutions.map(inst => (
              <tr key={inst.id} className="hover:bg-adm-page transition-colors">
                <td className="py-2.5 pr-4">
                  <p className="font-medium text-adm-bg">{inst.name}</p>
                  <p className="text-slate-500">{inst.shortName}</p>
                </td>
                <td className="py-2.5 pr-4 text-slate-600">{inst.studentCount}</td>
                <td className="py-2.5 pr-4 text-slate-600">{inst.activeStudents30d}</td>
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rc-green rounded-full" style={{ width: `${inst.avgCompletionPercent}%` }} />
                    </div>
                    <span className="text-slate-600">{Math.round(inst.avgCompletionPercent)}%</span>
                  </div>
                </td>
                <td className={clsx('py-2.5 pr-4', colColor(inst.avgCOLPercent))}>
                  {inst.avgCOLPercent != null ? `${Math.round(inst.avgCOLPercent)}%` : '—'}
                </td>
                <td className="py-2.5">
                  <span className={`stat-pill font-medium capitalize ${STATUS_STYLES[inst.status]}`}>{inst.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
