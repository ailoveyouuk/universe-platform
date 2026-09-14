import type { EmployerSummary } from '@/lib/data/types'

const TIER_STYLES: Record<EmployerSummary['partnerTier'], string> = {
  enterprise: 'bg-amber-50 text-amber-700',
  premium:    'bg-sky-50 text-sky-700',
  standard:   'bg-slate-100 text-slate-600',
}

const STATUS_STYLES: Record<EmployerSummary['status'], string> = {
  active:     'bg-emerald-50 text-emerald-700',
  onboarding: 'bg-amber-50 text-amber-700',
  inactive:   'bg-slate-100 text-slate-500',
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

interface EmployerOverviewTableProps {
  employers: EmployerSummary[]
}

export function EmployerOverviewTable({ employers }: EmployerOverviewTableProps) {
  if (employers.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="font-heading font-semibold text-adm-bg text-sm mb-4">Employers</h3>
        <p className="text-sm text-slate-500 text-center py-8">No employer partners onboarded yet</p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-adm-bg text-sm">Employer Partners</h3>
        <span className="text-xs text-slate-500">{employers.length} total</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-adm-cborder">
              {['Employer', 'Sector', 'Tier', 'Open Roles', 'Shortlisted', 'Last Active', 'Status'].map(h => (
                <th key={h} className="text-left font-semibold text-slate-500 uppercase tracking-wide pb-2 pr-4 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-adm-cborder">
            {employers.map(emp => (
              <tr key={emp.id} className="hover:bg-adm-page transition-colors">
                <td className="py-2.5 pr-4 font-medium text-adm-bg">{emp.name}</td>
                <td className="py-2.5 pr-4 text-slate-500">{emp.sector}</td>
                <td className="py-2.5 pr-4">
                  <span className={`stat-pill font-medium capitalize ${TIER_STYLES[emp.partnerTier]}`}>{emp.partnerTier}</span>
                </td>
                <td className="py-2.5 pr-4 text-slate-600">{emp.openRoles}</td>
                <td className="py-2.5 pr-4 text-slate-600">{emp.shortlistedCandidates}</td>
                <td className="py-2.5 pr-4 text-slate-500">{emp.lastActiveAt ? timeAgo(emp.lastActiveAt) : '—'}</td>
                <td className="py-2.5">
                  <span className={`stat-pill font-medium capitalize ${STATUS_STYLES[emp.status]}`}>{emp.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
